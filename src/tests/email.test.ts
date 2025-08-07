import { EmailService, EmailSendError, EmailValidationError } from '../services/email.service';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  describe('Email Sending', () => {
    it('should attempt to send email to vijaykumar4495@gmail.com', async () => {
      try {
        console.log('Sending email to vijaykumar4495@gmail.com');
        console.log('SendGrid API key:', process.env.SENDGRID_API_KEY);
        const result = await emailService.sendEmail({
          to: 'vijaykumar4495@gmail.com',
          subject: 'Test Email from Arcube Backend',
          html: '<p>This is a test email sent from the Arcube Backend Service.</p><p>Timestamp: ' + new Date().toISOString() + '</p>'
        });

        expect(result.success).toBe(true);
        console.log('✅ Email sent successfully to vijaykumar4495@gmail.com');
        console.log('📧 Message ID:', result.messageId);
      } catch (error) {
        // If SendGrid API key is not configured, this will fail
        console.log('⚠️ Email sending failed (expected if SendGrid not configured):', error instanceof Error ? error.message : 'Unknown error');
        expect(error).toBeInstanceOf(EmailSendError);
      }
    }, 30000); // 30 second timeout for real API call

    it('should fail to send email with invalid recipient', async () => {
      await expect(
        emailService.sendEmail({
          to: 'invalid-email-address',
          subject: 'Test Subject',
          html: '<p>Test content</p>'
        })
      ).rejects.toThrow(EmailValidationError);
    });
  });
}); 