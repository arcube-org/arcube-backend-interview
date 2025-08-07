import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Environment schema with validation rules
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server Configuration
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default(8080),
  HOST: z.string().default('localhost'),
  
  // Database Configuration
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  MONGODB_DB_NAME: z.string().min(1, 'MongoDB database name is required'),
  
  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  TOKEN_SECRET: z.string().min(32, 'Token secret must be at least 32 characters'),
  TOKEN_EXPIRES_IN: z.string().default('365d'),
  
  // Mock DragonPass Service Configuration
  MOCK_DRAGONPASS_SERVICE_URL: z.string().url('Mock DragonPass service URL must be a valid URL'),
  MOCK_DRAGONPASS_API_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000).max(30000)).default(10000),
  MOCK_SERVICE_API_KEY: z.string().min(1, 'Mock service API key is required'),
  
  // Email Configuration (SendGrid)
  SENDGRID_API_KEY: z.string().min(1, 'SendGrid API key is required'),
  SENDGRID_FROM_EMAIL: z.string().email('SendGrid from email must be a valid email'),
  SENDGRID_FROM_NAME: z.string().min(1, 'SendGrid from name is required'),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default(100),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  
  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000).max(10000)).default(5000),
});

// Parse and validate environment variables
const parseEnv = (): z.infer<typeof envSchema> => {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  return result.data;
};

// Export validated environment variables
export const env = parseEnv();

// Environment type for use throughout the application
export type Environment = typeof env;

// Helper function to check if we're in production
export const isProduction = (): boolean => env.NODE_ENV === 'production';

// Helper function to check if we're in development
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';

// Helper function to check if we're in test environment
export const isTest = (): boolean => env.NODE_ENV === 'test';

// Export environment schema for testing
export { envSchema };
