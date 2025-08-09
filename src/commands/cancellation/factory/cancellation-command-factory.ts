import { CancellationContext } from '../../../types/cancellation.types';
import { CancellationCommand } from '../base/cancellation-command';
import { DragonPassCancellationCommand } from '../providers/dragonpass-cancellation-command';
import { MozioCancellationCommand } from '../providers/mozio-cancellation-command';
import { AiraloCancellationCommand } from '../providers/airalo-cancellation-command';

export class CancellationCommandFactory {
  /**
   * Create a cancellation command based on the provider
   */
  static createCommand(provider: string, context: CancellationContext): CancellationCommand {
    switch (provider.toLowerCase()) {
      case 'dragonpass':
        return new DragonPassCancellationCommand(context);
      
      case 'mozio':
        return new MozioCancellationCommand(context);
      
      case 'airalo':
        return new AiraloCancellationCommand(context);
      
      default:
        // For unknown providers, return a service unavailable command
        return new DefaultCancellationCommand(context, provider);
    }
  }
}

/**
 * Default cancellation command for unknown providers
 */
class DefaultCancellationCommand extends CancellationCommand {
  private provider: string;

  constructor(context: CancellationContext, provider: string) {
    super(context);
    this.provider = provider;
  }

  async execute(): Promise<any> {
    this.validateContext();
    
    return {
      success: false,
      refundAmount: 0,
      cancellationFee: 0,
      currency: 'USD',
      status: 'failed',
      message: `Provider '${this.provider}' not supported`,
      errorCode: 'PROVIDER_NOT_SUPPORTED',
      externalResponse: {
        status: 'error',
        error_code: 'PROVIDER_NOT_SUPPORTED',
        message: `Provider '${this.provider}' is not supported for cancellations`
      }
    };
  }

  async undo(): Promise<void> {
    await this.defaultUndo();
  }

  getAuditInfo(): any {
    return this.createBaseAuditInfo(false, `Provider '${this.provider}' not supported`);
  }

  getProvider(): string {
    return this.provider;
  }

  getCommandType(): string {
    return 'DefaultCancellationCommand';
  }
} 