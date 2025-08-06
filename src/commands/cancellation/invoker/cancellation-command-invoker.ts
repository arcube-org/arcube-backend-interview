import { CancellationCommand } from '../base/cancellation-command';
import { CancellationResult, AuditInfo, CommandExecutionOptions } from '../../../types/cancellation.types';

export class CancellationCommandInvoker {
  private auditTrail: AuditInfo[] = [];
  private defaultOptions: CommandExecutionOptions = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    timeout: 30000, // 30 seconds
  };

  /**
   * Execute a cancellation command with retry logic
   */
  async executeCommand(
    command: CancellationCommand, 
    options?: CommandExecutionOptions
  ): Promise<CancellationResult> {
    const executionOptions = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= executionOptions.maxRetries!; attempt++) {
      try {
        console.log(`Executing ${command.getCommandType()} (attempt ${attempt}/${executionOptions.maxRetries})`);
        
        const result = await this.executeWithTimeout(command, executionOptions.timeout!);
        
        // Record successful execution
        const auditInfo = command.getAuditInfo();
        this.auditTrail.push(auditInfo);
        
        console.log(`Command executed successfully: ${result.message}`);
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Command execution failed (attempt ${attempt}):`, lastError.message);
        
        // Record failed execution
        const auditInfo = command.getAuditInfo();
        auditInfo.success = false;
        auditInfo.errorMessage = lastError.message;
        this.auditTrail.push(auditInfo);
        
        // If this is the last attempt, throw the error
        if (attempt === executionOptions.maxRetries!) {
          throw lastError;
        }
        
        // Wait before retrying
        await this.delay(executionOptions.retryDelay!);
      }
    }

    throw lastError || new Error('Command execution failed');
  }

  /**
   * Execute command with timeout
   */
  private async executeWithTimeout(
    command: CancellationCommand, 
    timeout: number
  ): Promise<CancellationResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command execution timed out after ${timeout}ms`));
      }, timeout);

      command.execute()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Retry failed commands from audit trail
   */
  async retryFailedCommands(): Promise<CancellationResult[]> {
    const failedAudits = this.auditTrail.filter(audit => !audit.success);
    const results: CancellationResult[] = [];

    for (const audit of failedAudits) {
      try {
        // Note: In a real implementation, you would need to recreate the command
        // from the audit information. For now, we'll just log the retry attempt.
        console.log(`Retrying failed command: ${audit.commandType} for provider: ${audit.provider}`);
        
        // This is a placeholder - in practice you'd need to recreate the command
        // with the original context and execute it again
        results.push({
          success: false,
          refundAmount: 0,
          cancellationFee: 0,
          currency: 'USD',
          status: 'failed',
          message: 'Retry not implemented in this version',
          errorCode: 'RETRY_NOT_IMPLEMENTED'
        });
        
      } catch (error) {
        console.error(`Retry failed for ${audit.commandType}:`, error);
        results.push({
          success: false,
          refundAmount: 0,
          cancellationFee: 0,
          currency: 'USD',
          status: 'failed',
          message: `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'RETRY_FAILED'
        });
      }
    }

    return results;
  }

  /**
   * Get the audit trail
   */
  getAuditTrail(): AuditInfo[] {
    return [...this.auditTrail];
  }

  /**
   * Clear the audit trail
   */
  clearAuditTrail(): void {
    this.auditTrail = [];
  }

  /**
   * Get audit trail for a specific correlation ID
   */
  getAuditTrailByCorrelationId(correlationId: string): AuditInfo[] {
    return this.auditTrail.filter(audit => audit.correlationId === correlationId);
  }

  /**
   * Get audit trail for a specific provider
   */
  getAuditTrailByProvider(provider: string): AuditInfo[] {
    return this.auditTrail.filter(audit => audit.provider === provider);
  }

  /**
   * Utility method for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 