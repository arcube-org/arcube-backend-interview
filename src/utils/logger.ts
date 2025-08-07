import winston from 'winston';
import { env } from '../config/environment';

// Custom log format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Simple format for development
const simpleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.simple()
);

// Create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.LOG_FORMAT === 'json' ? logFormat : simpleFormat,
  defaultMeta: {
    service: 'arcube-backend',
    environment: env.NODE_ENV,
    version: '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: env.LOG_FORMAT === 'json' ? logFormat : simpleFormat
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add correlation ID to log context
export interface LogContext {
  correlationId?: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  [key: string]: any;
}

// Enhanced logger with correlation ID support
export const createLogger = (correlationId?: string) => {
  return {
    info: (message: string, meta?: LogContext) => {
      logger.info(message, { correlationId, ...meta });
    },
    warn: (message: string, meta?: LogContext) => {
      logger.warn(message, { correlationId, ...meta });
    },
    error: (message: string, meta?: LogContext) => {
      logger.error(message, { correlationId, ...meta });
    },
    debug: (message: string, meta?: LogContext) => {
      logger.debug(message, { correlationId, ...meta });
    }
  };
};

// Default logger instance
export { logger };

// Helper function to generate correlation ID
export const generateCorrelationId = (): string => {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create request logger
export const createRequestLogger = (req: any) => {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = correlationId;
  
  return createLogger(correlationId);
}; 