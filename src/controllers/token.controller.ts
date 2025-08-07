import { Request, Response } from 'express';
import { TokenService, CreateTokenRequest } from '../services/token.service';
import { z } from 'zod';

// Validation schemas
const CreateTokenSchema = z.object({
  tokenType: z.enum(['api_key', 'service_token']),
  name: z.string().min(1, 'Token name is required').max(100, 'Token name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

const UpdateTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(100, 'Token name cannot exceed 100 characters').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

export const generateToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext?.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTH_REQUIRED',
      });
      return;
    }

    // Validate request body
    const validationResult = CreateTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        errorCode: 'VALIDATION_ERROR',
        details: validationResult.error.issues,
      });
      return;
    }

    // Role-based token creation validation
    const userRole = authContext.userRole;
    const requestedTokenType = validationResult.data.tokenType;

    // Partners can only create API keys
    if (userRole === 'partner' && requestedTokenType !== 'api_key') {
      res.status(403).json({
        success: false,
        error: 'Partners can only create API keys',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // System users can only create service tokens
    if (userRole === 'system' && requestedTokenType !== 'service_token') {
      res.status(403).json({
        success: false,
        error: 'System users can only create service tokens',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Regular users cannot create tokens
    if (userRole === 'user') {
      res.status(403).json({
        success: false,
        error: 'Regular users cannot create tokens',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    const request: CreateTokenRequest = {
      userId: authContext.userId,
      tokenType: validationResult.data.tokenType,
      name: validationResult.data.name,
      description: validationResult.data.description,
    };

    // Generate token
    const result = await TokenService.generateToken(request);

    res.status(201).json({
      success: true,
      message: 'Token generated successfully',
      data: {
        token: result.token,
        tokenInfo: result.tokenInfo,
      },
    });
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate token',
      errorCode: 'TOKEN_GENERATION_ERROR',
    });
  }
};

export const getUserTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext?.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTH_REQUIRED',
      });
      return;
    }

    const tokens = await TokenService.getUserTokens(authContext.userId);

    res.status(200).json({
      success: true,
      data: {
        tokens,
        count: tokens.length,
      },
    });
  } catch (error) {
    console.error('Get user tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tokens',
      errorCode: 'TOKEN_RETRIEVAL_ERROR',
    });
  }
};

export const blockToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext?.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTH_REQUIRED',
      });
      return;
    }

    const { tokenId } = req.params;

    if (!tokenId) {
      res.status(400).json({
        success: false,
        error: 'Token ID is required',
        errorCode: 'MISSING_TOKEN_ID',
      });
      return;
    }

    const token = await TokenService.blockToken(tokenId, authContext.userId);

    res.status(200).json({
      success: true,
      message: 'Token blocked successfully',
      data: token,
    });
  } catch (error) {
    console.error('Block token error:', error);
    if (error instanceof Error && error.message === 'Token not found') {
      res.status(404).json({
        success: false,
        error: 'Token not found',
        errorCode: 'TOKEN_NOT_FOUND',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to block token',
      errorCode: 'TOKEN_BLOCK_ERROR',
    });
  }
};



export const deleteToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext?.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTH_REQUIRED',
      });
      return;
    }

    const { tokenId } = req.params;

    if (!tokenId) {
      res.status(400).json({
        success: false,
        error: 'Token ID is required',
        errorCode: 'MISSING_TOKEN_ID',
      });
      return;
    }

    await TokenService.deleteToken(tokenId, authContext.userId);

    res.status(200).json({
      success: true,
      message: 'Token deleted successfully',
    });
  } catch (error) {
    console.error('Delete token error:', error);
    if (error instanceof Error && error.message === 'Token not found') {
      res.status(404).json({
        success: false,
        error: 'Token not found',
        errorCode: 'TOKEN_NOT_FOUND',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete token',
      errorCode: 'TOKEN_DELETE_ERROR',
    });
  }
};

// Admin endpoints for system-wide token management
export const getAllTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext?.permissions.includes('admin_access')) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // This would require adding a method to TokenService to get all tokens
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Admin token management endpoint - implementation pending',
      data: {
        tokens: [],
        count: 0,
      },
    });
  } catch (error) {
    console.error('Get all tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tokens',
      errorCode: 'TOKEN_RETRIEVAL_ERROR',
    });
  }
}; 