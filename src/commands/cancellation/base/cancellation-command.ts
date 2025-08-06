import { CancellationContext, CancellationResult, AuditInfo } from '../../../types/cancellation.types';

export abstract class CancellationCommand {
  protected context: CancellationContext;
  protected startTime: number;

  constructor(context: CancellationContext) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Execute the cancellation command
   */
  abstract execute(): Promise<CancellationResult>;

  /**
   * Undo the cancellation (rollback if needed)
   */
  abstract undo(): Promise<void>;

  /**
   * Get audit information about the command execution
   */
  abstract getAuditInfo(): AuditInfo;

  /**
   * Get the provider name
   */
  abstract getProvider(): string;

  /**
   * Get the command type
   */
  abstract getCommandType(): string;

  /**
   * Validate the cancellation context
   */
  protected validateContext(): void {
    if (!this.context.orderId) {
      throw new Error('Order ID is required');
    }
    if (!this.context.productId) {
      throw new Error('Product ID is required');
    }
    if (!this.context.requestedBy) {
      throw new Error('Requested by user is required');
    }
    if (!this.context.correlationId) {
      throw new Error('Correlation ID is required');
    }
  }

  /**
   * Calculate execution time
   */
  protected getExecutionTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Create a base audit info object
   */
  protected createBaseAuditInfo(success: boolean, errorMessage?: string): AuditInfo {
    const auditInfo: AuditInfo = {
      commandType: this.getCommandType(),
      provider: this.getProvider(),
      executionTime: this.getExecutionTime(),
      timestamp: new Date(),
      correlationId: this.context.correlationId,
      success,
    };

    if (errorMessage) {
      auditInfo.errorMessage = errorMessage;
    }

    return auditInfo;
  }
} 