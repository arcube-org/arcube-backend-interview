import { CancellationCommand } from '../base/cancellation-command';
import { 
  CancellationContext, 
  CancellationResult, 
  AuditInfo,
  DragonPassCancellationRequest,
  DragonPassCancellationResponse
} from '../../../types/cancellation.types';
import { ProductModel, ProductDocument } from '../../../models';
import { CancellationPolicyResult } from '../../../types/cancellation.types';

export class DragonPassCancellationCommand extends CancellationCommand {
  private product?: ProductDocument;
  private policyResult?: CancellationPolicyResult;

  constructor(context: CancellationContext) {
    super(context);
  }

  async execute(): Promise<CancellationResult> {
    try {
      this.validateContext();
      
      // 1. Load product and validate cancellation policy
      await this.loadProductAndValidatePolicy();
      
      // 2. Call DragonPass API
      const apiResponse = await this.callDragonPassApi();
      
      // 3. Process the response
      return this.processApiResponse(apiResponse);
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(): Promise<void> {
    // For DragonPass, we would typically call a reactivation API
    // For now, we'll just log the undo operation
    console.log(`Undoing DragonPass cancellation for order: ${this.context.orderId}`);
  }

  getAuditInfo(): AuditInfo {
    return this.createBaseAuditInfo(true);
  }

  getProvider(): string {
    return 'dragonpass';
  }

  getCommandType(): string {
    return 'DragonPassCancellationCommand';
  }

  private async loadProductAndValidatePolicy(): Promise<void> {
    // Load product
    const product = await ProductModel.findOne({ id: this.context.productId });
    if (!product) {
      throw new Error(`Product not found: ${this.context.productId}`);
    }
    this.product = product;

    // Validate provider
    if (this.product.provider !== 'dragonpass') {
      throw new Error(`Product provider is not DragonPass: ${this.product.provider}`);
    }

    // Calculate cancellation policy
    this.policyResult = this.calculateCancellationPolicy();
    
    if (!this.policyResult.canCancel) {
      throw new Error(`Cancellation not allowed: ${this.policyResult.message}`);
    }
  }

  private calculateCancellationPolicy(): CancellationPolicyResult {
    if (!this.product) {
      throw new Error('Product not loaded');
    }

    const { cancellationPolicy, price, serviceDateTime } = this.product;
    
    if (!cancellationPolicy.canCancel) {
      return {
        canCancel: false,
        refundAmount: 0,
        cancellationFee: price.amount,
        currency: price.currency,
        message: cancellationPolicy.cancelCondition || 'Cancellation not allowed'
      };
    }

    const now = new Date();
    const timeUntilService = serviceDateTime.getTime() - now.getTime();
    const hoursUntilService = timeUntilService / (1000 * 60 * 60);

    // Find applicable cancellation window
    const applicableWindow = cancellationPolicy.windows.find(window => 
      hoursUntilService >= window.hoursBeforeService
    );

    if (!applicableWindow) {
      return {
        canCancel: false,
        refundAmount: 0,
        cancellationFee: price.amount,
        currency: price.currency,
        message: 'Outside cancellation window'
      };
    }

    const refundAmount = (price.amount * applicableWindow.refundPercentage) / 100;
    const cancellationFee = price.amount - refundAmount;

    return {
      canCancel: true,
      refundAmount,
      cancellationFee,
      currency: price.currency,
      applicableWindow,
      message: applicableWindow.description
    };
  }

  private async callDragonPassApi(): Promise<DragonPassCancellationResponse> {
    if (!this.product) {
      throw new Error('Product not loaded');
    }

    const requestPayload: DragonPassCancellationRequest = {
      booking_id: this.product.metadata.bookingId as string,
      lounge_id: this.product.metadata.loungeId as string,
      booking_time: this.product.createdAt.toISOString(),
      product_id: this.product.id
    };

    const response = await fetch('http://localhost:3002/api/v1/cancellations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`DragonPass API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    return responseData as DragonPassCancellationResponse;
  }

  private processApiResponse(apiResponse: DragonPassCancellationResponse): CancellationResult {
    if (apiResponse.status === 'error') {
      const result: CancellationResult = {
        success: false,
        refundAmount: 0,
        cancellationFee: this.policyResult?.cancellationFee || 0,
        currency: this.policyResult?.currency || 'USD',
        status: 'failed',
        message: apiResponse.message || 'DragonPass API error',
        externalResponse: apiResponse
      };

      if (apiResponse.error_code) {
        result.errorCode = apiResponse.error_code;
      }
      if (apiResponse.retry_after) {
        result.retryAfter = apiResponse.retry_after;
      }

      return result;
    }

    // Success case
    const result: CancellationResult = {
      success: true,
      refundAmount: apiResponse.refund_amount || this.policyResult?.refundAmount || 0,
      cancellationFee: apiResponse.cancellation_fee || this.policyResult?.cancellationFee || 0,
      currency: apiResponse.currency || this.policyResult?.currency || 'USD',
      status: apiResponse.refund_amount === apiResponse.cancellation_fee ? 'partial' : 'completed',
      message: apiResponse.message || 'Cancellation successful',
      externalResponse: apiResponse
    };

    if (apiResponse.cancellation_id) {
      result.cancellationId = apiResponse.cancellation_id;
    }

    return result;
  }

  private handleError(error: any): CancellationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      refundAmount: 0,
      cancellationFee: this.policyResult?.cancellationFee || 0,
      currency: this.policyResult?.currency || 'USD',
      status: 'failed',
      message: errorMessage,
      errorCode: 'EXECUTION_ERROR',
      externalResponse: { error: errorMessage }
    };
  }
} 