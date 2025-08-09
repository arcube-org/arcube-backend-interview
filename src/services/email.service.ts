import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { 
  sendgridConfig, 
  EmailRequest, 
  EmailResponse, 
  EmailTemplate,
  isValidEmail,
  formatEmailAddress,
  getDefaultFromAddress
} from '../config/sendgrid.config';
import { logger } from '../utils/logger';

// Custom error classes for email service
export class EmailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailValidationError';
  }
}

export class EmailSendError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'EmailSendError';
  }
}

export class EmailTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailTemplateError';
  }
}

// Email service class
export class EmailService {
  private readonly config = sendgridConfig;
  private readonly logger = logger;

  constructor() {
    this.validateConfiguration();
  }

  /**
   * Validate SendGrid configuration
   */
  private validateConfiguration(): void {
    if (!this.config.apiKey) {
      throw new EmailValidationError('SendGrid API key is not configured');
    }
    if (!this.config.fromEmail) {
      throw new EmailValidationError('SendGrid from email is not configured');
    }
    if (!this.config.fromName) {
      throw new EmailValidationError('SendGrid from name is not configured');
    }
  }

  /**
   * Validate email request
   */
  private validateEmailRequest(request: EmailRequest): void {
    if (!request.to || (Array.isArray(request.to) && request.to.length === 0)) {
      throw new EmailValidationError('Recipient email is required');
    }

    if (Array.isArray(request.to)) {
      request.to.forEach(email => {
        if (!isValidEmail(email)) {
          throw new EmailValidationError(`Invalid email address: ${email}`);
        }
      });
    } else {
      if (!isValidEmail(request.to)) {
        throw new EmailValidationError(`Invalid email address: ${request.to}`);
      }
    }

    if (!request.subject || request.subject.trim().length === 0) {
      throw new EmailValidationError('Email subject is required');
    }

    if (!request.html || request.html.trim().length === 0) {
      throw new EmailValidationError('Email HTML content is required');
    }
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(request: EmailRequest): Promise<EmailResponse> {
    const correlationId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('Sending email', {
      correlationId,
      to: Array.isArray(request.to) ? request.to : [request.to],
      subject: request.subject,
      hasAttachments: request.attachments ? request.attachments.length > 0 : false
    });

    try {
      // Validate request
      this.validateEmailRequest(request);

      // Prepare mail data
      const mailData: MailDataRequired = {
        to: request.to,
        from: request.from || getDefaultFromAddress(),
        subject: request.subject,
        html: request.html,
        ...(request.text && { text: request.text }),
        ...(request.replyTo && { replyTo: request.replyTo }),
        ...(request.attachments && { attachments: request.attachments }),
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true
          },
          openTracking: {
            enable: true
          }
        }
      };

      // Send email with retry logic
      const result = await this.sendWithRetry(mailData, correlationId);

      this.logger.info('Email sent successfully', {
        correlationId,
        messageId: result.messageId,
        to: Array.isArray(request.to) ? request.to : [request.to]
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to send email', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        to: Array.isArray(request.to) ? request.to : [request.to],
        subject: request.subject
      });

      if (error instanceof EmailValidationError) {
        throw error;
      }

      throw new EmailSendError(
        error instanceof Error ? error.message : 'Failed to send email',
        error instanceof EmailSendError ? error.statusCode : undefined
      );
    }
  }

  /**
   * Send email with retry logic
   */
  private async sendWithRetry(
    mailData: MailDataRequired, 
    correlationId: string,
    attempt: number = 1
  ): Promise<EmailResponse> {
    try {
      const response = await sgMail.send(mailData);
      
      return {
        success: true,
        messageId: response[0]?.headers['x-message-id'] || undefined
      };

    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);
      const maxAttempts = this.config.retryAttempts;

      if (isRetryable && attempt < maxAttempts) {
        this.logger.warn('Email send failed, retrying', {
          correlationId,
          attempt,
          maxAttempts,
          error: error.message,
          statusCode: error.code
        });

        // Wait before retry
        await this.delay(this.config.retryDelay * attempt);

        return this.sendWithRetry(mailData, correlationId, attempt + 1);
      }

      // Final failure
      this.logger.error('Email send failed after all retries', {
        correlationId,
        attempt,
        maxAttempts,
        error: error.message,
        statusCode: error.code
      });

      throw new EmailSendError(
        `Failed to send email after ${attempt} attempts: ${error.message}`,
        error.code
      );
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors, rate limits, and server errors
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const retryableErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    
    return (
      retryableStatusCodes.includes(error.code) ||
      retryableErrorCodes.includes(error.code) ||
      error.message?.includes('timeout') ||
      error.message?.includes('network')
    );
  }

  /**
   * Delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    to: string | string[],
    template: EmailTemplate,
    replyTo?: string
  ): Promise<EmailResponse> {
    if (!template.subject || !template.html) {
      throw new EmailTemplateError('Template must have subject and HTML content');
    }

    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      ...(template.text && { text: template.text }),
      ...(replyTo && { replyTo })
    });
  }

  /**
   * Send cancellation notification email
   */
  async sendCancellationNotification(
    to: string,
    orderId: string,
    productName: string,
    refundAmount: number,
    currency: string = 'USD'
  ): Promise<EmailResponse> {
    const template: EmailTemplate = {
      subject: `Cancellation Confirmed - Order ${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Cancellation Confirmed</h2>
          <p>Dear Customer,</p>
          <p>Your cancellation request has been processed successfully.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Refund Amount:</strong> ${currency} ${refundAmount.toFixed(2)}</p>
          </div>
          
          <p>The refund will be processed within 5-7 business days.</p>
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>The Arcube Team</p>
        </div>
      `,
      text: `
        Cancellation Confirmed - Order ${orderId}
        
        Dear Customer,
        
        Your cancellation request has been processed successfully.
        
        Order Details:
        - Order ID: ${orderId}
        - Product: ${productName}
        - Refund Amount: ${currency} ${refundAmount.toFixed(2)}
        
        The refund will be processed within 5-7 business days.
        
        If you have any questions, please contact our support team.
        
        Best regards,
        The Arcube Team
      `
    };

    return this.sendTemplateEmail(to, template);
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<EmailResponse> {
    const template: EmailTemplate = {
      subject: 'Test Email - Arcube Backend Service',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from the Arcube Backend Service.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p>If you received this email, the SendGrid integration is working correctly!</p>
        </div>
      `,
      text: `
        Test Email - Arcube Backend Service
        
        This is a test email from the Arcube Backend Service.
        
        Timestamp: ${new Date().toISOString()}
        Environment: ${process.env.NODE_ENV || 'development'}
        
        If you received this email, the SendGrid integration is working correctly!
      `
    };

    return this.sendTemplateEmail(to, template);
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      // Test SendGrid API by sending a test email to a non-existent address
      // This will fail but we can check if the API key is valid
      await sgMail.send({
        to: 'test@example.com',
        from: getDefaultFromAddress(),
        subject: 'Health Check',
        html: '<p>Health check</p>'
      });
      
      return { status: 'healthy' };
    } catch (error: any) {
      // If we get a 401 or 403, the API key is invalid
      if (error.code === 401 || error.code === 403) {
        return { 
          status: 'unhealthy', 
          error: 'Invalid SendGrid API key' 
        };
      }
      
      // Other errors might be expected (like sending to non-existent address)
      // but we can still consider the service healthy if we get a response
      return { status: 'healthy' };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService(); 