import { z } from 'zod';
import sgMail from '@sendgrid/mail';
import { env } from './environment';

// SendGrid configuration schema
const sendgridConfigSchema = z.object({
  apiKey: z.string().min(1, 'SendGrid API key is required'),
  fromEmail: z.email('SendGrid from email must be a valid email'),
  fromName: z.string().min(1, 'SendGrid from name is required'),
  timeout: z.number().min(1000).max(30000).default(10000), // 10 seconds default
  retryAttempts: z.number().min(1).max(5).default(3),
  retryDelay: z.number().min(1000).max(10000).default(2000), // 2 seconds default
});

// SendGrid configuration type
export type SendGridConfig = z.infer<typeof sendgridConfigSchema>;

// Email template interface
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Email request interface
export interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition?: string;
  }>;
}

// Email response interface
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

// Initialize SendGrid configuration
const createSendGridConfig = (): SendGridConfig => {
  const config = {
    apiKey: env.SENDGRID_API_KEY,
    fromEmail: env.SENDGRID_FROM_EMAIL,
    fromName: env.SENDGRID_FROM_NAME,
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 2000,
  };

  const result = sendgridConfigSchema.safeParse(config);
  
  if (!result.success) {
    console.error('❌ SendGrid configuration validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid SendGrid configuration');
  }

  return result.data;
};

// Initialize SendGrid
const initializeSendGrid = (config: SendGridConfig): void => {
  try {
    sgMail.setApiKey(config.apiKey);
    console.log('✅ SendGrid initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SendGrid:', error);
    throw new Error('SendGrid initialization failed');
  }
};

// Create SendGrid configuration instance
export const sendgridConfig = createSendGridConfig();

// Initialize SendGrid with configuration
initializeSendGrid(sendgridConfig);

// Export SendGrid mail instance
export { sgMail };

// Helper function to validate email address
export const isValidEmail = (email: string): boolean => {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
};

// Helper function to format email addresses
export const formatEmailAddress = (email: string, name?: string): string => {
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
};

// Helper function to create default from address
export const getDefaultFromAddress = (): string => {
  return formatEmailAddress(sendgridConfig.fromEmail, sendgridConfig.fromName);
};

// Export configuration schema for testing
export { sendgridConfigSchema }; 