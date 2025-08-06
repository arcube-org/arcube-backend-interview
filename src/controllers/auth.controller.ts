import { Request, Response } from 'express';
import { AuthService, LoginCredentials } from '../services/auth.service';
import { LoginRequestSchema } from '../validations/user.validation';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validationResult = LoginRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        errorCode: 'VALIDATION_ERROR',
        details: validationResult.error.issues
      });
      return;
    }

    const credentials = validationResult.data as LoginCredentials;

    // Authenticate user
    const authResult = await AuthService.authenticateUser(credentials);

    if (!authResult.success) {
      res.status(401).json({
        success: false,
        error: authResult.error,
        errorCode: authResult.errorCode
      });
      return;
    }

    // Return success response with token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: authResult.token,
        user: {
          id: authResult.authContext?.userId,
          email: authResult.authContext?.metadata?.email,
          role: authResult.authContext?.userRole,
          permissions: authResult.authContext?.permissions
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = req.authContext;

    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTH_REQUIRED'
      });
      return;
    }

    // Fetch user from database using AuthService
    if (!authContext.userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid authentication context',
        errorCode: 'INVALID_AUTH_CONTEXT'
      });
      return;
    }

    const user = await AuthService.findUserById(authContext.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
      return;
    }

    // Return user profile from database
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        permissions: authContext.permissions,
        requestSource: authContext.requestSource,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    });
  }
}; 