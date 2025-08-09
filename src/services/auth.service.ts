import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel, UserDocument } from '../models/user.model';
import { env } from '../config/environment';
import { JwtPayload, AuthResult, AuthContext, REQUEST_SOURCE_MAP, ROLE_PERMISSIONS } from '../types/auth.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;

      // Find user by email and include password for comparison
      const user = await UserModel.findOne({ email }).select('+password');
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated',
          errorCode: 'ACCOUNT_DEACTIVATED'
        };
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // Generate JWT token
      const token = AuthService.generateJwtToken(user);

      const authContext: AuthContext = {
        type: 'jwt',
        userId: user.id,
        userRole: user.role,
        permissions: AuthService.getUserPermissions(user.role),
        requestSource: REQUEST_SOURCE_MAP.jwt,
        metadata: {
          email: user.email
        }
      };

      return {
        success: true,
        authContext,
        token
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication service error',
        errorCode: 'AUTH_SERVICE_ERROR'
      };
    }
  }

  /**
   * Generate JWT token for user
   */
  static generateJwtToken(user: UserDocument): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: AuthService.getUserPermissions(user.role)
    };

    const options: SignOptions = {
      expiresIn: '24h'
    };
    
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  /**
   * Validate JWT token and return user context
   */
  static async validateJwtToken(token: string): Promise<AuthResult> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      // Find user in database
      const user = await UserModel.findOne({ id: decoded.userId, isActive: true });
      
      if (!user) {
        return {
          success: false,
          error: 'User not found or inactive',
          errorCode: 'USER_NOT_FOUND'
        };
      }

      const authContext: AuthContext = {
        type: 'jwt',
        userId: user.id,
        userRole: user.role,
        permissions: AuthService.getUserPermissions(user.role),
        requestSource: REQUEST_SOURCE_MAP.jwt,
        metadata: {
          email: user.email
        }
      };

      return {
        success: true,
        authContext
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          error: 'Invalid JWT token',
          errorCode: 'INVALID_JWT'
        };
      }
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: 'JWT token expired',
          errorCode: 'JWT_EXPIRED'
        };
      }
      
      console.error('JWT validation error:', error);
      return {
        success: false,
        error: 'JWT validation error',
        errorCode: 'JWT_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Get user permissions based on role
   */
  static getUserPermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return [...ROLE_PERMISSIONS.admin];
      case 'partner':
        return [...ROLE_PERMISSIONS.partner];
      case 'user':
        return [...ROLE_PERMISSIONS.customer];
      case 'system':
        return [...ROLE_PERMISSIONS.system];
      default:
        return [];
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(userId: string): Promise<UserDocument | null> {
    return UserModel.findOne({ id: userId, isActive: true });
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase(), isActive: true });
  }
} 