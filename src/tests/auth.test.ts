import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { env } from '../config/environment';

const TEST_USER_EMAILS = [
  'test@example.com',
  'admin@test.com',
  'user@test.com',
  'inactive@test.com'
];

const clearTestUsers = async (): Promise<void> => {
  await UserModel.deleteMany({ email: { $in: TEST_USER_EMAILS } });
};

describe('Authentication System', () => {
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await clearTestUsers();
  });

  afterEach(async () => {
    await clearTestUsers();
  });

  describe('User Model with Password', () => {
    it('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123',
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe('TestPassword123');
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/);

      const isValid = await savedUser.comparePassword('TestPassword123');
      expect(isValid).toBe(true);

      const isInvalid = await savedUser.comparePassword('WrongPassword');
      expect(isInvalid).toBe(false);
    });

    it('should explicitly hash password and compare using bcrypt', async () => {
      const plainPassword = 'TestPassword123';
      
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
      
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/);
      expect(hashedPassword).not.toBe(plainPassword);

      const isValidPassword = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValidPassword).toBe(true);

      const isInvalidPassword = await bcrypt.compare('WrongPassword', hashedPassword);
      expect(isInvalidPassword).toBe(false);

      const hashedPassword2 = await bcrypt.hash(plainPassword, saltRounds);
      expect(hashedPassword).not.toBe(hashedPassword2);
      
      const isValidPassword2 = await bcrypt.compare(plainPassword, hashedPassword2);
      expect(isValidPassword2).toBe(true);

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: plainPassword,
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(plainPassword);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/);

      const isValid = await savedUser.comparePassword(plainPassword);
      expect(isValid).toBe(true);
    });

    it('should not include password in JSON output', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123',
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();
      const userJson = savedUser.toJSON();

      expect(userJson.password).toBeUndefined();
      expect(userJson.name).toBe('Test User');
      expect(userJson.email).toBe('test@example.com');
    });
  });

  describe('AuthService', () => {
    beforeEach(async () => {
      const users = [
        {
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'AdminPass123',
          role: 'admin' as const,
          isActive: true,
        },
        {
          name: 'Regular User',
          email: 'user@test.com',
          password: 'UserPass123',
          role: 'user' as const,
          isActive: true,
        },
        {
          name: 'Inactive User',
          email: 'inactive@test.com',
          password: 'InactivePass123',
          role: 'user' as const,
          isActive: false,
        },
      ];

      for (const userData of users) {
        const user = new UserModel(userData);
        await user.save();
      }
    });

    it('should authenticate valid user credentials', async () => {
      const credentials = {
        email: 'admin@test.com',
        password: 'AdminPass123',
      };

      const result = await AuthService.authenticateUser(credentials);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.userId).toBeDefined();
      expect(result.authContext?.userRole).toBe('admin');
      expect(result.authContext?.permissions).toContain('cancel_any_order');
    });

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'admin@test.com',
        password: 'WrongPassword',
      };

      const result = await AuthService.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('should reject inactive user', async () => {
      const credentials = {
        email: 'inactive@test.com',
        password: 'InactivePass123',
      };

      const result = await AuthService.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
      expect(result.errorCode).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should reject non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@test.com',
        password: 'AnyPassword',
      };

      const result = await AuthService.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('should validate JWT token', async () => {
      const credentials = {
        email: 'user@test.com',
        password: 'UserPass123',
      };

      const authResult = await AuthService.authenticateUser(credentials);
      expect(authResult.success).toBe(true);
      expect(authResult.token).toBeDefined();

      const validationResult = await AuthService.validateJwtToken(authResult.token!);

      expect(validationResult.success).toBe(true);
      expect(validationResult.authContext).toBeDefined();
      expect(validationResult.authContext?.userRole).toBe('user');
      expect(validationResult.authContext?.permissions).toContain('cancel_own_orders');
    });

    it('should reject invalid JWT token', async () => {
      const result = await AuthService.validateJwtToken('invalid.token.here');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JWT token');
      expect(result.errorCode).toBe('INVALID_JWT');
    });

    it('should reject expired JWT token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const result = await AuthService.validateJwtToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_JWT');
    });
  });

  describe('MultiTierAuthMiddleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        role: 'user',
        isActive: true,
      });
      await user.save();

      mockReq = {
        headers: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('should authenticate valid JWT token', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPass123',
      };
      const authResult = await AuthService.authenticateUser(credentials);
      expect(authResult.success).toBe(true);

      mockReq.headers.authorization = `Bearer ${authResult.token}`;

      MultiTierAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.authContext).toBeDefined();
      expect(mockReq.authContext.userRole).toBe('user');
    });

    it('should reject invalid JWT token', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token.here';

      MultiTierAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'INVALID_JWT',
        })
      );
    });

    it('should reject request without authentication', async () => {
      MultiTierAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'NO_AUTH_METHOD',
        })
      );
    });
  });
}); 