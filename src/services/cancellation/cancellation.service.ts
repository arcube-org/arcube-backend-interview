import { v4 as uuidv4 } from 'uuid';
import { CancellationCommandFactory } from '../../commands/cancellation/factory/cancellation-command-factory';
import { CancellationCommandInvoker } from '../../commands/cancellation/invoker/cancellation-command-invoker';
import { 
  CancellationResult, 
  CancelOrderRequest, 
  EnhancedCancellationContext 
} from '../../types/cancellation.types';
import { AuthContext } from '../../types/auth.types';
import { CancellationRepository } from '../../repositories/cancellation.repository';
import { OrderRepository } from '../../repositories/order.repository';
import { OrderLookupService } from '../order-lookup.service';
import { ProductModel, OrderModel } from '../../models';
import { EventBusService } from '../event-bus.service';
import { CancellationEvent, CancellationEventType } from '../../types/webhook.types';

export class CancellationService {
  private commandInvoker: CancellationCommandInvoker;
  private cancellationRepository: CancellationRepository;
  private orderRepository: OrderRepository;
  private orderLookupService: OrderLookupService;
  private eventBus: EventBusService;

  constructor() {
    this.commandInvoker = new CancellationCommandInvoker();
    this.cancellationRepository = new CancellationRepository();
    this.orderRepository = new OrderRepository();
    this.orderLookupService = new OrderLookupService();
    this.eventBus = EventBusService.getInstance();
  }

  /**
   * Cancel order or product using enhanced request format
   */
  async cancelOrder(
    payload: CancelOrderRequest,
    authContext: AuthContext
  ): Promise<CancellationResult | CancellationResult[]> {
    const correlationId = uuidv4();
    
    try {
      // 1. Lookup order and validate access
      const lookupResult = await this.orderLookupService.lookupOrder(payload, authContext);
      
      if (!lookupResult.canAccess) {
        const result: CancellationResult = {
          success: false,
          refundAmount: 0,
          cancellationFee: 0,
          currency: 'USD',
          status: 'failed',
          message: lookupResult.accessReason || 'Access denied',
          errorCode: 'ACCESS_DENIED'
        };

        // Publish cancellation failed event
        await this.publishCancellationEvent(
          CancellationEventType.CANCELLATION_FAILED,
          {
            orderId: payload.orderIdentifier.pnr,
            productId: payload.productId,
            reason: payload.reason,
            errorCode: 'ACCESS_DENIED',
            errorMessage: result.message
          },
          correlationId
        );

        return result;
      }

      if (!lookupResult.order) {
        const result: CancellationResult = {
          success: false,
          refundAmount: 0,
          cancellationFee: 0,
          currency: 'USD',
          status: 'failed',
          message: 'Order not found',
          errorCode: 'ORDER_NOT_FOUND'
        };

        // Publish cancellation failed event
        await this.publishCancellationEvent(
          CancellationEventType.CANCELLATION_FAILED,
          {
            orderId: payload.orderIdentifier.pnr,
            productId: payload.productId,
            reason: payload.reason,
            errorCode: 'ORDER_NOT_FOUND',
            errorMessage: result.message
          },
          correlationId
        );

        return result;
      }

      // 2. Validate order status
      const orderStatusValidation = this.orderLookupService.validateOrderStatus(lookupResult.order);
      if (!orderStatusValidation.canCancel) {
        const result: CancellationResult = {
          success: false,
          refundAmount: 0,
          cancellationFee: 0,
          currency: 'USD',
          status: 'failed',
          message: orderStatusValidation.reason || 'Order cannot be cancelled',
          errorCode: 'ORDER_STATUS_INVALID'
        };

        // Publish cancellation failed event
        await this.publishCancellationEvent(
          CancellationEventType.CANCELLATION_FAILED,
          {
            orderId: lookupResult.order.id,
            productId: payload.productId,
            reason: payload.reason,
            errorCode: 'ORDER_STATUS_INVALID',
            errorMessage: result.message
          },
          correlationId
        );

        return result;
      }

      // 3. Publish cancellation started event
      await this.publishCancellationEvent(
        CancellationEventType.CANCELLATION_STARTED,
        {
          orderId: lookupResult.order.id,
          productId: payload.productId,
          reason: payload.reason,
          requestedBy: payload.requestedBy,
          requestSource: payload.requestSource
        },
        correlationId
      );

      // 4. Determine cancellation type (single product vs entire order)
      if (payload.productId) {
        // Single product cancellation
        return await this.cancelSingleProduct(payload, lookupResult, authContext, correlationId);
      } else {
        // Entire order cancellation
        return await this.cancelEntireOrder(payload, lookupResult, authContext, correlationId);
      }

    } catch (error) {
      console.error('Enhanced cancellation service error:', error);
      
      // Publish cancellation failed event
      await this.publishCancellationEvent(
        CancellationEventType.CANCELLATION_FAILED,
        {
          orderId: payload.orderIdentifier.pnr,
          productId: payload.productId,
          reason: payload.reason,
          errorCode: 'INTERNAL_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        correlationId
      );

      return this.handleServiceError(error);
    }
  }

  /**
   * Cancel a single product in an order
   */
  private async cancelSingleProduct(
    payload: CancelOrderRequest,
    lookupResult: any,
    authContext: AuthContext,
    correlationId: string
  ): Promise<CancellationResult> {
    const { order, product } = lookupResult;

    if (!product) {
      const result: CancellationResult = {
        success: false,
        refundAmount: 0,
        cancellationFee: 0,
        currency: 'USD',
        status: 'failed',
        message: 'Product not found in order',
        errorCode: 'PRODUCT_NOT_FOUND'
      };

      // Publish cancellation failed event
      await this.publishCancellationEvent(
        CancellationEventType.CANCELLATION_FAILED,
        {
          orderId: order.id,
          productId: payload.productId,
          reason: payload.reason,
          errorCode: 'PRODUCT_NOT_FOUND',
          errorMessage: result.message
        },
        correlationId
      );

      return result;
    }

    // Validate product status
    const productStatusValidation = this.orderLookupService.validateProductStatus(product);
    if (!productStatusValidation.canCancel) {
      const result: CancellationResult = {
        success: false,
        refundAmount: 0,
        cancellationFee: 0,
        currency: 'USD',
        status: 'failed',
        message: productStatusValidation.reason || 'Product cannot be cancelled',
        errorCode: 'PRODUCT_STATUS_INVALID'
      };

      // Publish cancellation failed event
      await this.publishCancellationEvent(
        CancellationEventType.CANCELLATION_FAILED,
        {
          orderId: order.id,
          productId: payload.productId,
          reason: payload.reason,
          errorCode: 'PRODUCT_STATUS_INVALID',
          errorMessage: result.message
        },
        correlationId
      );

      return result;
    }

    // Create cancellation context
    const context: EnhancedCancellationContext = {
      orderId: order.id,
      productId: payload.productId || product.id, // Use product.id as fallback
      reason: payload.reason || 'No reason provided',
      requestedBy: payload.requestedBy.userId,
      requestSource: payload.requestSource,
      correlationId: correlationId,
      authContext
    };

    // Execute cancellation
    return await this.executeCancellation(context, product, correlationId);
  }

  /**
   * Cancel entire order
   */
  private async cancelEntireOrder(
    payload: CancelOrderRequest,
    lookupResult: any,
    authContext: AuthContext,
    correlationId: string
  ): Promise<CancellationResult[]> {
    const { order } = lookupResult;
    const results: CancellationResult[] = [];

    // Get all products in the order
    const products = await this.orderLookupService.getOrderProducts(order.id);
    
    if (products.length === 0) {
      const result: CancellationResult = {
        success: false,
        refundAmount: 0,
        cancellationFee: 0,
        currency: 'USD',
        status: 'failed',
        message: 'No products found in order',
        errorCode: 'NO_PRODUCTS_FOUND'
      };

      // Publish cancellation failed event
      await this.publishCancellationEvent(
        CancellationEventType.CANCELLATION_FAILED,
        {
          orderId: order.id,
          productId: payload.productId,
          reason: payload.reason,
          errorCode: 'NO_PRODUCTS_FOUND',
          errorMessage: result.message
        },
        correlationId
      );

      return [result];
    }

    // Cancel each product individually
    for (const product of products) {
      try {
        // Validate product status
        const productStatusValidation = this.orderLookupService.validateProductStatus(product);
        if (!productStatusValidation.canCancel) {
          const result: CancellationResult = {
            success: false,
            refundAmount: 0,
            cancellationFee: 0,
            currency: 'USD',
            status: 'failed',
            message: productStatusValidation.reason || 'Product cannot be cancelled',
            errorCode: 'PRODUCT_STATUS_INVALID'
          };

          // Publish cancellation failed event
          await this.publishCancellationEvent(
            CancellationEventType.CANCELLATION_FAILED,
            {
              orderId: order.id,
              productId: product.id,
              reason: payload.reason,
              errorCode: 'PRODUCT_STATUS_INVALID',
              errorMessage: result.message
            },
            correlationId
          );

          results.push(result);
          continue;
        }

        // Create cancellation context for this product
        const context: EnhancedCancellationContext = {
          orderId: order.id,
          productId: product.id,
          reason: payload.reason || 'No reason provided',
          requestedBy: payload.requestedBy.userId,
          requestSource: payload.requestSource,
          correlationId: correlationId,
          authContext
        };

        // Execute cancellation for this product
        const result = await this.executeCancellation(context, product, correlationId);
        results.push(result);

      } catch (error) {
        console.error(`Failed to cancel product ${product.id}:`, error);
        const result: CancellationResult = {
          success: false,
          refundAmount: 0,
          cancellationFee: 0,
          currency: 'USD',
          status: 'failed',
          message: `Failed to cancel product: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'PRODUCT_CANCELLATION_FAILED'
        };

        // Publish cancellation failed event
        await this.publishCancellationEvent(
          CancellationEventType.CANCELLATION_FAILED,
          {
            orderId: order.id,
            productId: product.id,
            reason: payload.reason,
            errorCode: 'PRODUCT_CANCELLATION_FAILED',
            errorMessage: result.message
          },
          correlationId
        );

        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute cancellation using command pattern
   */
  private async executeCancellation(
    context: EnhancedCancellationContext,
    product: any,
    correlationId: string
  ): Promise<CancellationResult> {
    // 1. Create cancellation record
    const cancellationRecord = await this.cancellationRepository.create({
      orderId: context.orderId,
      productId: context.productId || product.id, // Ensure productId is always defined
      reason: context.reason,
      requestedBy: context.requestedBy,
      status: 'pending',
      correlationId: context.correlationId
    });

    try {
      // 2. Create and execute cancellation command
      const command = CancellationCommandFactory.createCommand(product.provider, {
        orderId: context.orderId,
        productId: context.productId || product.id,
        reason: context.reason,
        requestedBy: context.requestedBy,
        requestSource: context.requestSource === 'customer_app' ? 'customer' : 
                      context.requestSource === 'admin_panel' ? 'admin' : 'system',
        correlationId: context.correlationId
      });

      const result = await this.commandInvoker.executeCommand(command);

      // 3. Update cancellation record with result
      await this.cancellationRepository.updateCancellationStatus(
        cancellationRecord.id,
        result.success ? 'completed' : 'failed',
        result.message
      );

      // 4. Update product and order status
      await this.updateProductAndOrderStatus(context.orderId, product, result);

      // 5. Publish appropriate event based on result
      if (result.success) {
        if (result.status === 'partial') {
          await this.publishCancellationEvent(
            CancellationEventType.CANCELLATION_PARTIAL,
            {
              orderId: context.orderId,
              productId: context.productId,
              reason: context.reason,
              refundAmount: result.refundAmount,
              cancellationFee: result.cancellationFee,
              currency: result.currency
            },
            correlationId
          );
        } else {
          await this.publishCancellationEvent(
            CancellationEventType.CANCELLATION_COMPLETED,
            {
              orderId: context.orderId,
              productId: context.productId,
              reason: context.reason,
              refundAmount: result.refundAmount,
              cancellationFee: result.cancellationFee,
              currency: result.currency
            },
            correlationId
          );
        }
      } else {
        await this.publishCancellationEvent(
          CancellationEventType.CANCELLATION_FAILED,
          {
            orderId: context.orderId,
            productId: context.productId,
            reason: context.reason,
            errorCode: result.errorCode,
            errorMessage: result.message
          },
          correlationId
        );
      }

      return result;

    } catch (error) {
      console.error('Cancellation execution error:', error);
      
      // Update cancellation record with error
      await this.cancellationRepository.updateCancellationStatus(
        cancellationRecord.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Publish cancellation failed event
      await this.publishCancellationEvent(
        CancellationEventType.CANCELLATION_FAILED,
        {
          orderId: context.orderId,
          productId: context.productId,
          reason: context.reason,
          errorCode: 'EXECUTION_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        correlationId
      );

      return this.handleServiceError(error);
    }
  }

  /**
   * Update product and order status after successful cancellation
   */
  private async updateProductAndOrderStatus(
    orderId: string,
    product: any,
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
    const order = await this.orderRepository.findById(orderId);
    if (order) {
      const allProducts = await this.orderLookupService.getOrderProducts(orderId);
      const allCancelled = allProducts.every(p => 
        p.status === 'cancelled' || p.status === 'refunded'
      );

      if (allCancelled) {
        // Update order status
        await OrderModel.findOneAndUpdate(
          { id: orderId },
          { 
            status: 'cancelled',
            updatedAt: new Date()
          }
        );
      }
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

  /**
   * Publish cancellation events
   */
  private async publishCancellationEvent(
    eventType: CancellationEventType,
    eventData: any,
    correlationId: string
  ): Promise<void> {
    const event: CancellationEvent = {
      type: eventType,
      data: eventData,
      timestamp: new Date(),
      correlationId,
      orderId: eventData.orderId,
      productId: eventData.productId
    };
    
    await this.eventBus.publish(event);
  }
} 