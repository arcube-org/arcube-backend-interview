import { Request, Response, NextFunction } from 'express';
import { AuthContext, AuthResult, REQUEST_SOURCE_MAP, ROLE_PERMISSIONS } from '../../types/auth.types';
import { AuthService } from '../../services/auth.service';

// Extend Request interface to include auth context
declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

export class MultiTierAuthMiddleware {
  /**
   * Main authentication middleware that determines auth type and validates
   */
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    MultiTierAuthMiddleware.determineAuthType(req)
      .then((authResult) => {
        if (!authResult.success) {
          res.status(401).json({
            success: false,
            error: authResult.error,
            errorCode: authResult.errorCode
          });
          return;
        }

        // Attach auth context to request
        if (authResult.authContext) {
          req.authContext = authResult.authContext;
        }
        next();
      })
      .catch((error) => {
        console.error('Authentication error:', error);
        res.status(500).json({
          success: false,
          error: 'Authentication service error',
          errorCode: 'AUTH_SERVICE_ERROR'
        });
      });
  }

  /**
   * Determine authentication type and validate accordingly
   */
  private static async determineAuthType(req: Request): Promise<AuthResult> {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const serviceTokenHeader = req.headers['x-service-token'];

    // Check for JWT token (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return await MultiTierAuthMiddleware.validateJwt(authHeader.substring(7));
    }

    // Check for API key
    if (apiKeyHeader) {
      return MultiTierAuthMiddleware.validateApiKey(apiKeyHeader as string);
    }

    // Check for service token
    if (serviceTokenHeader) {
      return MultiTierAuthMiddleware.validateServiceToken(serviceTokenHeader as string);
    }

    return {
      success: false,
      error: 'No valid authentication method provided',
      errorCode: 'NO_AUTH_METHOD'
    };
  }

  /**
   * Validate JWT token using AuthService
   */
  private static async validateJwt(token: string): Promise<AuthResult> {
    if (!token || token.length < 10) {
      return {
        success: false,
        error: 'Invalid JWT token',
        errorCode: 'INVALID_JWT'
      };
    }

    // Use AuthService to validate JWT token
    return await AuthService.validateJwtToken(token);
  }

  /**
   * Validate API key (using constant values for now)
   */
  private static validateApiKey(apiKey: string): AuthResult {
    // For now, accept any API key and return a mock partner
    // In real implementation, this would validate against a database of API keys
    
    if (!apiKey || apiKey.length < 10) {
      return {
        success: false,
        error: 'Invalid API key',
        errorCode: 'INVALID_API_KEY'
      };
    }

    // Mock API key payload - in real implementation, this would be looked up from database
    const mockApiKeyPayload = {
      partnerId: 'partner-456',
      partnerName: 'Test Partner',
      permissions: ROLE_PERMISSIONS.partner,
      apiKey: apiKey
    };

    const authContext: AuthContext = {
      type: 'api_key',
      partnerId: mockApiKeyPayload.partnerId,
      permissions: [...mockApiKeyPayload.permissions],
      requestSource: REQUEST_SOURCE_MAP.api_key,
      metadata: {
        partnerName: mockApiKeyPayload.partnerName
      }
    };

    return {
      success: true,
      authContext
    };
  }

  /**
   * Validate service token (using constant values for now)
   */
  private static validateServiceToken(token: string): AuthResult {
    // For now, accept any service token and return a mock admin user
    // In real implementation, this would validate against a secure token store
    
    if (!token || token.length < 10) {
      return {
        success: false,
        error: 'Invalid service token',
        errorCode: 'INVALID_SERVICE_TOKEN'
      };
    }

    // Mock service token payload - in real implementation, this would be validated
    const mockServiceTokenPayload = {
      serviceId: 'admin-service-789',
      serviceName: 'Admin Panel',
      permissions: ROLE_PERMISSIONS.admin,
      scope: ['admin_panel', 'system']
    };

    const authContext: AuthContext = {
      type: 'service_token',
      userId: mockServiceTokenPayload.serviceId,
      userRole: 'admin',
      permissions: [...mockServiceTokenPayload.permissions],
      requestSource: REQUEST_SOURCE_MAP.service_token,
      metadata: {
        serviceName: mockServiceTokenPayload.serviceName,
        scope: mockServiceTokenPayload.scope
      }
    };

    return {
      success: true,
      authContext
    };
  }

  /**
   * Check if user has required permissions
   */
  static hasPermission(requiredPermission: string): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const authContext = req.authContext;
      
      if (!authContext) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorCode: 'AUTH_REQUIRED'
        });
        return;
      }

      if (!authContext.permissions.includes(requiredPermission)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      next();
    };
  }

  /**
   * Check if user can access specific order (for customer access control)
   */
  static canAccessOrder(orderEmail: string): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const authContext = req.authContext;
      
      if (!authContext) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorCode: 'AUTH_REQUIRED'
        });
        return;
      }

      // Admin, customer service, and system users can access any order
      if (['admin', 'customer_service', 'system'].includes(authContext.userRole || '')) {
        return next();
      }

      // Customers can only access their own orders
      if (authContext.type === 'jwt' && authContext.metadata?.email === orderEmail) {
        return next();
      }

      res.status(403).json({
        success: false,
        error: 'Access denied to this order',
        errorCode: 'ORDER_ACCESS_DENIED'
      });
    };
  }
} 