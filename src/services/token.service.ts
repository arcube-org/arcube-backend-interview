import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenModel, TokenDocument } from '../models/token.model';
import { UserModel } from '../models/user.model';
import { env } from '../config/environment';
import { AuthResult, AuthContext, REQUEST_SOURCE_MAP, ROLE_PERMISSIONS } from '../types/auth.types';

export interface TokenPayload {
  // Standard JWT claims
  sub: string; // Subject (userId)
  iat: number; // Issued at (epoch timestamp)
  exp: number; // Expiration (epoch timestamp)
  
  // Custom claims
  tokenId: string;
  userId: string;
  userRole: string;
  email: string;
  tokenType: 'api_key' | 'service_token';
  permissions: string[];
  name: string;
}

export interface CreateTokenRequest {
  userId: string;
  tokenType: 'api_key' | 'service_token';
  name: string;
  description?: string | undefined;
}

export interface TokenInfo {
  id: string;
  name: string;
  description?: string | undefined;
  tokenType: 'api_key' | 'service_token';
  permissions: string[];
  isActive: boolean;
  isBlocked: boolean;
  lastUsedAt?: Date | undefined;
  expiresAt?: number | undefined; // Epoch timestamp
  createdAt: Date;
  status: string;
}

export class TokenService {
  /**
   * Generate a new API key or service token
   */
  static async generateToken(request: CreateTokenRequest): Promise<{ token: string; tokenInfo: TokenInfo }> {
    try {
      // Verify user exists and is active
      const user = await UserModel.findOne({ id: request.userId, isActive: true });
      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Generate unique token hash
      const tokenHash = crypto.randomBytes(32).toString('hex');
      
      // Set permissions based on token type (all permissions for each type)
      const permissions = request.tokenType === 'api_key' 
        ? [...ROLE_PERMISSIONS.partner] 
        : [...ROLE_PERMISSIONS.system];

      // Calculate expiration epoch timestamp (365 days default)
      const expirationMs = this.parseExpiration(env.TOKEN_EXPIRES_IN);
      const expiresAt = Math.floor((Date.now() + expirationMs) / 1000); // Store as epoch timestamp

      // Create token document
      const tokenDoc = new TokenModel({
        userId: request.userId,
        tokenType: request.tokenType,
        tokenHash,
        name: request.name,
        description: request.description || undefined,
        permissions,
        expiresAt,
      });

      await tokenDoc.save();

      // Calculate epoch timestamps
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const expirationSeconds = Math.floor(this.parseExpiration(env.TOKEN_EXPIRES_IN) / 1000);
      const exp = now + expirationSeconds;

      // Generate JWT token with epoch timestamps
      const payload: TokenPayload = {
        // Standard JWT claims
        sub: request.userId,
        iat: now,
        exp: exp,
        
        // Custom claims
        tokenId: tokenDoc.id,
        userId: request.userId,
        userRole: user.role,
        email: user.email,
        tokenType: request.tokenType,
        permissions,
        name: request.name,
      };

      const token = jwt.sign(payload, env.TOKEN_SECRET);

      return {
        token,
        tokenInfo: this.mapToTokenInfo(tokenDoc),
      };
    } catch (error) {
      console.error('Token generation error:', error);
      throw error;
    }
  }

  /**
   * Validate token and return auth context
   */
  static async validateToken(token: string, tokenType: 'api_key' | 'service_token'): Promise<AuthResult> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, env.TOKEN_SECRET) as TokenPayload;

      // Find token in database
      const tokenDoc = await TokenModel.findOne({
        id: decoded.tokenId,
        tokenType,
        isActive: true,
        isBlocked: false,
      });

      if (!tokenDoc) {
        return {
          success: false,
          error: 'Token not found or invalid',
          errorCode: 'TOKEN_NOT_FOUND',
        };
      }

      // Check if token is expired (using epoch timestamp)
      const now = Math.floor(Date.now() / 1000);
      if (tokenDoc.expiresAt && tokenDoc.expiresAt < now) {
        return {
          success: false,
          error: 'Token expired',
          errorCode: 'TOKEN_EXPIRED',
        };
      }

      // Update last used timestamp
      await TokenModel.updateOne(
        { id: decoded.tokenId },
        { lastUsedAt: new Date() }
      );

      // Get user information
      const user = await UserModel.findOne({ id: decoded.userId, isActive: true });
      if (!user) {
        return {
          success: false,
          error: 'User not found or inactive',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      const authContext: AuthContext = {
        type: tokenType,
        userId: decoded.userId,
        userRole: decoded.userRole, // Use role from JWT payload
        permissions: decoded.permissions,
        requestSource: tokenType === 'api_key' ? REQUEST_SOURCE_MAP.api_key : REQUEST_SOURCE_MAP.service_token,
        metadata: {
          email: decoded.email, // Use email from JWT payload
          tokenName: decoded.name,
          tokenId: decoded.tokenId,
        },
      };

      return {
        success: true,
        authContext,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          error: 'Invalid token',
          errorCode: 'INVALID_TOKEN',
        };
      }
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: 'Token expired',
          errorCode: 'TOKEN_EXPIRED',
        };
      }

      console.error('Token validation error:', error);
      return {
        success: false,
        error: 'Token validation error',
        errorCode: 'TOKEN_VALIDATION_ERROR',
      };
    }
  }

  /**
   * Get user's active tokens (excluding blocked and deleted)
   */
  static async getUserTokens(userId: string): Promise<TokenInfo[]> {
    const tokens = await TokenModel.find({ 
      userId, 
      isActive: true, 
      isBlocked: false 
    }).sort({ createdAt: -1 });
    return tokens.map(this.mapToTokenInfo);
  }

  /**
   * Get all user's tokens (including blocked ones)
   */
  static async getAllUserTokens(userId: string): Promise<TokenInfo[]> {
    const tokens = await TokenModel.find({ 
      userId, 
      isActive: true 
    }).sort({ createdAt: -1 });
    return tokens.map(this.mapToTokenInfo);
  }

  /**
   * Block a token
   */
  static async blockToken(tokenId: string, userId: string): Promise<TokenInfo> {
    const token = await TokenModel.findOneAndUpdate(
      { id: tokenId, userId },
      { isBlocked: true },
      { new: true }
    );

    if (!token) {
      throw new Error('Token not found');
    }

    return this.mapToTokenInfo(token);
  }

  /**
   * Delete a token (soft delete by blocking)
   */
  static async deleteToken(tokenId: string, userId: string): Promise<void> {
    const result = await TokenModel.updateOne(
      { id: tokenId, userId },
      { isActive: false, isBlocked: true }
    );
    
    if (result.modifiedCount === 0) {
      throw new Error('Token not found');
    }
  }

  /**
   * Parse expiration string to milliseconds
   */
  private static parseExpiration(expiresIn: string): number {
    const units: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format. Use format like "30s", "5m", "2h", "1d"');
    }

    const [, value, unit] = match;
    if (!unit || !units[unit]) {
      throw new Error('Invalid expiration unit. Use s, m, h, or d');
    }
    return parseInt(value!) * units[unit];
  }

  /**
   * Map token document to token info
   */
  private static mapToTokenInfo(token: TokenDocument): TokenInfo {
    return {
      id: token.id,
      name: token.name,
      description: token.description || undefined,
      tokenType: token.tokenType,
      permissions: token.permissions,
      isActive: token.isActive,
      isBlocked: token.isBlocked,
      lastUsedAt: token.lastUsedAt || undefined,
      expiresAt: token.expiresAt || undefined,
      createdAt: token.createdAt,
      status: (token as any).status, // Virtual field
    };
  }
} 