import { v4 as uuidv4 } from 'uuid';
import { CancellationCommandFactory } from '../../commands/cancellation/factory/cancellation-command-factory';
import { CancellationCommandInvoker } from '../../commands/cancellation/invoker/cancellation-command-invoker';
import { CancellationContext, CancellationResult } from '../../types/cancellation.types';
import { CancellationRepository } from '../../repositories/cancellation.repository';
import { OrderRepository } from '../../repositories/order.repository';
import { ProductModel, ProductDocument } from '../../models';
import { OrderModel, OrderDocument } from '../../models';

export class CancellationService {
  private commandInvoker: CancellationCommandInvoker;
  private cancellationRepository: CancellationRepository;
  private orderRepository: OrderRepository;

  constructor() {
    this.commandInvoker = new CancellationCommandInvoker();
    this.cancellationRepository = new CancellationRepository();
    this.orderRepository = new OrderRepository();
  }

  /**
   * Cancel a product in an order
   */
  async cancelProduct(
    orderId: string,
    productId: string,
    reason: string,
    requestedBy: string,
    requestSource: 'customer' | 'admin' | 'system' = 'customer'
  ): Promise<CancellationResult> {
    try {
      // 1. Validate order and product
      const { order, product } = await this.validateOrderAndProduct(orderId, productId);

      // 2. Create cancellation context
      const context: CancellationContext = {
        orderId,
        productId,
        reason,
        requestedBy,
        requestSource,
        correlationId: uuidv4()
      };

      // 3. Create cancellation record
      const cancellationRecord = await this.cancellationRepository.createCancellationRequest({
        orderId,
        productId,
        reason,
        requestSource,
        requestedBy,
        refundAmount: 0, // Will be updated after command execution
        cancellationFee: 0, // Will be updated after command execution
        currency: product.price.currency,
        status: 'pending',
        correlationId: context.correlationId,
        cancelledAt: new Date()
      });

      // 4. Create and execute command
      const command = CancellationCommandFactory.createCommand(product.provider, context);
      const result = await this.commandInvoker.executeCommand(command);

      // 5. Update cancellation record with result
      await this.cancellationRepository.updateCancellationStatus(
        cancellationRecord.id,
        result.success ? 'completed' : 'failed',
        {
          provider: product.provider,
          response: result.externalResponse,
          timestamp: new Date()
        }
      );

      // 6. Update product and order status if successful
      if (result.success) {
        await this.updateProductAndOrderStatus(order, product, result);
      }

      return result;

    } catch (error) {
      console.error('Cancellation service error:', error);
      return this.handleServiceError(error);
    }
  }

  /**
   * Cancel an entire order
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    requestedBy: string,
    requestSource: 'customer' | 'admin' | 'system' = 'customer'
  ): Promise<CancellationResult[]> {
    try {
      // 1. Get order with products
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const results: CancellationResult[] = [];

      // 2. Cancel each product in the order
      for (const productId of order.products) {
        try {
          const result = await this.cancelProduct(
            orderId,
            productId,
            reason,
            requestedBy,
            requestSource
          );
          results.push(result);
        } catch (error) {
          console.error(`Failed to cancel product ${productId}:`, error);
          results.push({
            success: false,
            refundAmount: 0,
            cancellationFee: 0,
            currency: 'USD',
            status: 'failed',
            message: `Failed to cancel product: ${error instanceof Error ? error.message : 'Unknown error'}`,
            errorCode: 'PRODUCT_CANCELLATION_FAILED'
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Order cancellation error:', error);
      return [this.handleServiceError(error)];
    }
  }

  /**
   * Get cancellation audit trail
   */
  getAuditTrail() {
    return this.commandInvoker.getAuditTrail();
  }

  /**
   * Get cancellation audit trail by correlation ID
   */
  getAuditTrailByCorrelationId(correlationId: string) {
    return this.commandInvoker.getAuditTrailByCorrelationId(correlationId);
  }

  /**
   * Retry failed cancellations
   */
  async retryFailedCancellations(): Promise<CancellationResult[]> {
    return await this.commandInvoker.retryFailedCommands();
  }

  /**
   * Validate order and product
   */
  private async validateOrderAndProduct(orderId: string, productId: string): Promise<{
    order: OrderDocument;
    product: ProductDocument;
  }> {
    // Validate order
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Check if product is in the order
    if (!order.products.includes(productId)) {
      throw new Error(`Product ${productId} is not part of order ${orderId}`);
    }

    // Validate product
    const product = await ProductModel.findOne({ id: productId });
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Check if product can be cancelled
    if (!product.cancellationPolicy.canCancel) {
      throw new Error(`Product ${productId} cannot be cancelled: ${product.cancellationPolicy.cancelCondition}`);
    }

    return { order, product };
  }

  /**
   * Update product and order status after successful cancellation
   */
  private async updateProductAndOrderStatus(
    order: OrderDocument,
    product: ProductDocument,
    result: CancellationResult
  ): Promise<void> {
    // Update product status
    await ProductModel.findOneAndUpdate(
      { id: product.id },
      { 
        status: result.status === 'completed' ? 'cancelled' : 'refunded',
        updatedAt: new Date()
      }
    );

    // Check if all products in order are cancelled
    const allProducts = await ProductModel.find({ id: { $in: order.products } });
    const allCancelled = allProducts.every(p => 
      p.status === 'cancelled' || p.status === 'refunded'
    );

    if (allCancelled) {
      // Update order status
      await OrderModel.findOneAndUpdate(
        { id: order.id },
        { 
          status: 'cancelled',
          updatedAt: new Date()
        }
      );
    }
  }

  /**
   * Handle service errors
   */
  private handleServiceError(error: any): CancellationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      refundAmount: 0,
      cancellationFee: 0,
      currency: 'USD',
      status: 'failed',
      message: errorMessage,
      errorCode: 'SERVICE_ERROR',
      externalResponse: { error: errorMessage }
    };
  }
} 