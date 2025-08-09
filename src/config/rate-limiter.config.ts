import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter configuration for different endpoints and user types
export class RateLimiterConfig {
  /**
   * General rate limiter for all cancellation endpoints
   * - 100 requests per 15 minutes per IP
   */
  static generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
      });
    }
  });

  /**
   * Strict rate limiter for customer cancellation requests
   * - 10 requests per hour per IP (more restrictive for customers)
   */
  static customerCancellationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100000, // limit each IP to 10 cancellation requests per hour
    message: {
      success: false,
      error: 'Too many cancellation requests, please try again later.',
      errorCode: 'CANCELLATION_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many cancellation requests, please try again later.',
        errorCode: 'CANCELLATION_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(60 * 60) // 1 hour in seconds
      });
    }
  });

  /**
   * Admin rate limiter for admin panel requests
   * - 50 requests per 15 minutes per IP (more generous for admins)
   */
  static adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50000, // limit each IP to 50 requests per 15 minutes
    message: {
      success: false,
      error: 'Too many admin requests, please try again later.',
      errorCode: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many admin requests, please try again later.',
        errorCode: 'ADMIN_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
      });
    }
  });

  /**
   * Partner API rate limiter
   * - 200 requests per 15 minutes per IP (generous for partners)
   */
  static partnerApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200000, // limit each IP to 200 requests per 15 minutes
    message: {
      success: false,
      error: 'Too many partner API requests, please try again later.',
      errorCode: 'PARTNER_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many partner API requests, please try again later.',
        errorCode: 'PARTNER_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
      });
    }
  });

  /**
   * System rate limiter for internal/system requests
   * - 500 requests per 15 minutes per IP (very generous for system)
   */
  static systemLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500000, // limit each IP to 500 requests per 15 minutes
    message: {
      success: false,
      error: 'Too many system requests, please try again later.',
      errorCode: 'SYSTEM_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many system requests, please try again later.',
        errorCode: 'SYSTEM_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
      });
    }
  });

  /**
   * Audit trail rate limiter (more restrictive for audit endpoints)
   * - 20 requests per 15 minutes per IP
   */
  static auditTrailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200000, // limit each IP to 20 audit requests per 15 minutes
    message: {
      success: false,
      error: 'Too many audit trail requests, please try again later.',
      errorCode: 'AUDIT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many audit trail requests, please try again later.',
        errorCode: 'AUDIT_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
      });
    }
  });

  /**
   * Dynamic rate limiter based on authentication type
   * This can be used to apply different limits based on the auth context
   */
  static getDynamicLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req: Request) => {
        // Get auth context from request (set by auth middleware)
        const authContext = (req as any).authContext;
        
        if (!authContext) {
          return 10; // Default limit for unauthenticated requests
        }

        // Different limits based on auth type
        switch (authContext.type) {
          case 'jwt':
            return 200000; // Customer requests
          case 'api_key':
            return 100000; // Partner requests
          case 'service_token':
            return 200000; // Admin/System requests
          default:
            return 100000; // Default limit
        }
      },
      message: {
        success: false,
        error: 'Rate limit exceeded for your authentication type.',
        errorCode: 'DYNAMIC_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded for your authentication type.',
          errorCode: 'DYNAMIC_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
        });
      }
    });
  }
} 