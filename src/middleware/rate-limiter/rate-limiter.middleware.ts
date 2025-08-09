import { Request, Response, NextFunction } from 'express';
import { RateLimiterConfig } from '../../config/rate-limiter.config';

/**
 * Rate Limiter Middleware
 * Provides middleware functions for different rate limiting scenarios
 */
export class RateLimiterMiddleware {
  /**
   * Apply customer cancellation rate limiting
   * - 10 requests per hour per IP
   */
  static customerCancellation(req: Request, res: Response, next: NextFunction): void {
    RateLimiterConfig.customerCancellationLimiter(req, res, next);
  }

  /**
   * Apply audit trail rate limiting
   * - 20 requests per 15 minutes per IP
   */
  static auditTrail(req: Request, res: Response, next: NextFunction): void {
    RateLimiterConfig.auditTrailLimiter(req, res, next);
  }

  /**
   * Apply general rate limiting
   * - 100 requests per 15 minutes per IP
   */
  static general(req: Request, res: Response, next: NextFunction): void {
    RateLimiterConfig.generalLimiter(req, res, next);
  }

  /**
   * Apply admin rate limiting
   * - 50 requests per 15 minutes per IP
   */
  static admin(req: Request, res: Response, next: NextFunction): void {
    RateLimiterConfig.adminLimiter(req, res, next);
  }

  /**
   * Apply partner API rate limiting
   * - 200 requests per 15 minutes per IP
   */
  static partnerApi(req: Request, res: Response, next: NextFunction): void {
    RateLimiterConfig.partnerApiLimiter(req, res, next);
  }

  /**
   * Apply system rate limiting
   * - 500 requests per 15 minutes per IP
   */
  static system(req: Request, res: Response, next: NextFunction): void {
    RateLimiterConfig.systemLimiter(req, res, next);
  }

  /**
   * Apply dynamic rate limiting based on authentication context
   * - Different limits based on auth type (JWT, API Key, Service Token)
   */
  static dynamic(req: Request, res: Response, next: NextFunction): void {
    const dynamicLimiter = RateLimiterConfig.getDynamicLimiter();
    dynamicLimiter(req, res, next);
  }

  /**
   * Apply rate limiting based on request source
   * - Automatically selects appropriate limiter based on request headers
   */
  static byRequestSource(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const serviceTokenHeader = req.headers['x-service-token'];

    // Determine request source and apply appropriate rate limiting
    if (serviceTokenHeader) {
      // Admin/System request
      RateLimiterConfig.systemLimiter(req, res, next);
    } else if (apiKeyHeader) {
      // Partner API request
      RateLimiterConfig.partnerApiLimiter(req, res, next);
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Customer JWT request
      RateLimiterConfig.customerCancellationLimiter(req, res, next);
    } else {
      // Default/unknown request
      RateLimiterConfig.generalLimiter(req, res, next);
    }
  }

  /**
   * Apply rate limiting based on endpoint type
   * - Different limits for different endpoint categories
   */
  static byEndpointType(endpointType: 'cancellation' | 'audit' | 'general' | 'admin' | 'partner' | 'system') {
    return (req: Request, res: Response, next: NextFunction): void => {
      switch (endpointType) {
        case 'cancellation':
          RateLimiterConfig.customerCancellationLimiter(req, res, next);
          break;
        case 'audit':
          RateLimiterConfig.auditTrailLimiter(req, res, next);
          break;
        case 'admin':
          RateLimiterConfig.adminLimiter(req, res, next);
          break;
        case 'partner':
          RateLimiterConfig.partnerApiLimiter(req, res, next);
          break;
        case 'system':
          RateLimiterConfig.systemLimiter(req, res, next);
          break;
        case 'general':
        default:
          RateLimiterConfig.generalLimiter(req, res, next);
          break;
      }
    };
  }
} 