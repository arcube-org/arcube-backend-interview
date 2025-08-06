import { CancellationCommand } from '../base/cancellation-command';
import { CancellationContext, CancellationResult, AuditInfo } from '../../../types/cancellation.types';

export class MozioCancellationCommand extends CancellationCommand {
  async execute(): Promise<CancellationResult> {
    try {
      this.validateContext();
      
      // Mozio service is unavailable
      return {
        success: false,
        refundAmount: 0,
        cancellationFee: 0,
        currency: 'USD',
        status: 'failed',
        message: 'Service unavailable',
        errorCode: 'SERVICE_UNAVAILABLE',
        externalResponse: {
          status: 'error',
          error_code: 'SERVICE_UNAVAILABLE',
          message: 'Vendor service temporarily unavailable',
          retry_after: 900
        }
      };
      
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(): Promise<void> {
    console.log(`Undoing Mozio cancellation for order: ${this.context.orderId}`);
  }

  getAuditInfo(): AuditInfo {
    return this.createBaseAuditInfo(false, 'Service unavailable');
  }

  getProvider(): string {
    return 'mozio';
  }

  getCommandType(): string {
    return 'MozioCancellationCommand';
  }

  private handleError(error: any): CancellationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      refundAmount: 0,
      cancellationFee: 0,
      currency: 'USD',
      status: 'failed',
      message: errorMessage,
      errorCode: 'EXECUTION_ERROR',
      externalResponse: { error: errorMessage }
    };
  }
} 