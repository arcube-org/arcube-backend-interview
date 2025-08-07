import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { TokenService } from '../services/token.service';
import { UserModel } from '../models/user.model';
import { TokenModel } from '../models/token.model';
import { env } from '../config/environment';

describe('TokenService', () => {
  let partnerUser: any;
  let systemUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(env.MONGODB_URI);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await TokenModel.deleteMany({});
    await UserModel.deleteMany({ 
      email: { $in: ['partner@test.com', 'system@test.com', 'admin@test.com'] } 
    });
    
    // Create test users with different roles
    partnerUser = new UserModel({
      name: 'Partner User',
      email: 'partner@test.com',
      password: 'password123',
      role: 'partner',
      dateOfBirth: new Date('1985-06-18'),
      nationality: 'United States',
    });
    await partnerUser.save();

    systemUser = new UserModel({
      name: 'System User',
      email: 'system@test.com',
      password: 'password123',
      role: 'system',
      // No dateOfBirth or nationality for system role
    });
    await systemUser.save();

    adminUser = new UserModel({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      dateOfBirth: new Date('1980-09-22'),
      nationality: 'United Kingdom',
    });
    await adminUser.save();
  });

  afterAll(async () => {
    // Clean up
    await UserModel.deleteMany({ 
      email: { $in: ['partner@test.com', 'system@test.com', 'admin@test.com'] } 
    });
    await TokenModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('generateToken', () => {
    it('should generate an API key successfully with partner permissions', async () => {
      const request = {
        userId: partnerUser.id,
        tokenType: 'api_key' as const,
        name: 'Test API Key',
        description: 'Test description',
      };

      const result = await TokenService.generateToken(request);

      expect(result.token).toBeDefined();
      expect(result.tokenInfo).toBeDefined();
      expect(result.tokenInfo.name).toBe('Test API Key');
      expect(result.tokenInfo.tokenType).toBe('api_key');
      expect(result.tokenInfo.isActive).toBe(true);
      expect(result.tokenInfo.isBlocked).toBe(false);
      expect(result.tokenInfo.permissions).toEqual(expect.arrayContaining(['cancel_partner_orders']));

      // Clean up
      await TokenService.deleteToken(result.tokenInfo.id, partnerUser.id);
    });

    it('should generate a service token successfully with system permissions', async () => {
      const request = {
        userId: systemUser.id,
        tokenType: 'service_token' as const,
        name: 'Test Service Token',
        description: 'Test service token description',
      };

      const result = await TokenService.generateToken(request);

      expect(result.token).toBeDefined();
      expect(result.tokenInfo).toBeDefined();
      expect(result.tokenInfo.name).toBe('Test Service Token');
      expect(result.tokenInfo.tokenType).toBe('service_token');
      expect(result.tokenInfo.isActive).toBe(true);
      expect(result.tokenInfo.isBlocked).toBe(false);
      expect(result.tokenInfo.permissions).toEqual(expect.arrayContaining(['cancel_system_orders']));

      // Clean up
      await TokenService.deleteToken(result.tokenInfo.id, systemUser.id);
    });

    it('should generate token with epoch timestamps in JWT payload', async () => {
      const request = {
        userId: adminUser.id,
        tokenType: 'api_key' as const,
        name: 'Test API Key with Epoch',
      };

      const result = await TokenService.generateToken(request);

      // Verify JWT payload contains epoch timestamps
      const decoded = jwt.verify(result.token, env.TOKEN_SECRET) as any;
      
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
      
      // Verify custom claims
      expect(decoded.sub).toBe(adminUser.id);
      expect(decoded.userId).toBe(adminUser.id);
      expect(decoded.userRole).toBe('admin');
      expect(decoded.email).toBe(adminUser.email);
      expect(decoded.tokenType).toBe('api_key');
      expect(decoded.tokenId).toBeDefined();
      expect(decoded.name).toBe('Test API Key with Epoch');

      // Clean up
      await TokenService.deleteToken(result.tokenInfo.id, adminUser.id);
    });

    it('should store expiration as epoch timestamp in database', async () => {
      const request = {
        userId: adminUser.id,
        tokenType: 'service_token' as const,
        name: 'Test Service Token',
      };

      const result = await TokenService.generateToken(request);

      // Verify database stores epoch timestamp
      const tokenDoc = await TokenModel.findOne({ id: result.tokenInfo.id });
      expect(tokenDoc).toBeDefined();
      expect(typeof tokenDoc!.expiresAt).toBe('number');
      expect(tokenDoc!.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Clean up
      await TokenService.deleteToken(result.tokenInfo.id, adminUser.id);
    });

    it('should throw error for non-existent user', async () => {
      const request = {
        userId: 'non-existent-user-id',
        tokenType: 'api_key' as const,
        name: 'Test API Key',
      };

      await expect(TokenService.generateToken(request)).rejects.toThrow('User not found or inactive');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid API key', async () => {
      // Generate a token first
      const request = {
        userId: partnerUser.id,
        tokenType: 'api_key' as const,
        name: 'Test API Key for Validation',
      };

      const generated = await TokenService.generateToken(request);

      // Validate the token
      const result = await TokenService.validateToken(generated.token, 'api_key');

      expect(result.success).toBe(true);
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.userId).toBe(partnerUser.id);
      expect(result.authContext?.type).toBe('api_key');
      expect(result.authContext?.userRole).toBe('partner');
      expect(result.authContext?.metadata?.email).toBe(partnerUser.email);

      // Clean up
      await TokenService.deleteToken(generated.tokenInfo.id, partnerUser.id);
    });

    it('should validate a valid service token', async () => {
      // Generate a token first
      const request = {
        userId: systemUser.id,
        tokenType: 'service_token' as const,
        name: 'Test Service Token for Validation',
      };

      const generated = await TokenService.generateToken(request);

      // Validate the token
      const result = await TokenService.validateToken(generated.token, 'service_token');

      expect(result.success).toBe(true);
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.userId).toBe(systemUser.id);
      expect(result.authContext?.type).toBe('service_token');
      expect(result.authContext?.userRole).toBe('system');
      expect(result.authContext?.metadata?.email).toBe(systemUser.email);

      // Clean up
      await TokenService.deleteToken(generated.tokenInfo.id, systemUser.id);
    });

    it('should reject invalid token', async () => {
      const result = await TokenService.validateToken('invalid-token', 'api_key');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_TOKEN');
    });

    it('should reject token with wrong type', async () => {
      // Generate an API key
      const request = {
        userId: partnerUser.id,
        tokenType: 'api_key' as const,
        name: 'Test API Key for Type Validation',
      };

      const generated = await TokenService.generateToken(request);

      // Try to validate as service token
      const result = await TokenService.validateToken(generated.token, 'service_token');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TOKEN_NOT_FOUND');

      // Clean up
      await TokenService.deleteToken(generated.tokenInfo.id, partnerUser.id);
    });
  });

  describe('blockToken', () => {
    it('should block a token successfully', async () => {
      // Generate a token first
      const request = {
        userId: partnerUser.id,
        tokenType: 'api_key' as const,
        name: 'Test API Key for Blocking',
      };

      const generated = await TokenService.generateToken(request);

      // Block the token
      const blockedToken = await TokenService.blockToken(generated.tokenInfo.id, partnerUser.id);

      expect(blockedToken.isBlocked).toBe(true);
      expect(blockedToken.isActive).toBe(true);

      // Verify blocked token cannot be validated
      const validationResult = await TokenService.validateToken(generated.token, 'api_key');
      expect(validationResult.success).toBe(false);
      expect(validationResult.errorCode).toBe('TOKEN_NOT_FOUND');

      // Clean up
      await TokenService.deleteToken(generated.tokenInfo.id, partnerUser.id);
    });

    it('should throw error when blocking non-existent token', async () => {
      await expect(TokenService.blockToken('non-existent-token-id', partnerUser.id))
        .rejects.toThrow('Token not found');
    });
  });

  describe('deleteToken', () => {
    it('should soft delete a token successfully', async () => {
      // Generate a token first
      const request = {
        userId: adminUser.id,
        tokenType: 'api_key' as const,
        name: 'Test API Key for Deletion',
      };

      const generated = await TokenService.generateToken(request);

      // Delete the token (soft delete)
      await TokenService.deleteToken(generated.tokenInfo.id, adminUser.id);

      // Verify deleted token cannot be validated
      const validationResult = await TokenService.validateToken(generated.token, 'api_key');
      expect(validationResult.success).toBe(false);
      expect(validationResult.errorCode).toBe('TOKEN_NOT_FOUND');

      // Verify token is not returned in getUserTokens
      const tokens = await TokenService.getUserTokens(adminUser.id);
      expect(tokens.some(t => t.id === generated.tokenInfo.id)).toBe(false);
    });

    it('should throw error when deleting non-existent token', async () => {
      await expect(TokenService.deleteToken('non-existent-token-id', adminUser.id))
        .rejects.toThrow('Token not found');
    });
  });

  describe('getUserTokens', () => {
    it('should return only active, non-blocked tokens', async () => {
      // Generate multiple tokens
      const token1 = await TokenService.generateToken({
        userId: adminUser.id,
        tokenType: 'api_key',
        name: 'Active Token 1',
      });

      const token2 = await TokenService.generateToken({
        userId: adminUser.id,
        tokenType: 'service_token',
        name: 'Active Token 2',
      });

      // Block one token
      await TokenService.blockToken(token1.tokenInfo.id, adminUser.id);

      // Delete another token
      await TokenService.deleteToken(token2.tokenInfo.id, adminUser.id);

      // Get user tokens (should only return active, non-blocked tokens)
      const tokens = await TokenService.getUserTokens(adminUser.id);

      // Should not include blocked or deleted tokens
      expect(tokens.some(t => t.id === token1.tokenInfo.id)).toBe(false);
      expect(tokens.some(t => t.id === token2.tokenInfo.id)).toBe(false);

      // Clean up
      await TokenService.deleteToken(token1.tokenInfo.id, adminUser.id);
      await TokenService.deleteToken(token2.tokenInfo.id, adminUser.id);
    });

    it('should return tokens with correct permissions', async () => {
      // Generate API key
      const apiKey = await TokenService.generateToken({
        userId: partnerUser.id,
        tokenType: 'api_key',
        name: 'Partner API Key',
      });

      // Generate service token
      const serviceToken = await TokenService.generateToken({
        userId: systemUser.id,
        tokenType: 'service_token',
        name: 'System Service Token',
      });

      // Get tokens
      const partnerTokens = await TokenService.getUserTokens(partnerUser.id);
      const systemTokens = await TokenService.getUserTokens(systemUser.id);

      // Verify permissions
      const partnerToken = partnerTokens.find(t => t.id === apiKey.tokenInfo.id);
      const systemToken = systemTokens.find(t => t.id === serviceToken.tokenInfo.id);

      expect(partnerToken?.permissions).toEqual(expect.arrayContaining(['cancel_partner_orders']));
      expect(systemToken?.permissions).toEqual(expect.arrayContaining(['cancel_system_orders']));

      // Clean up
      await TokenService.deleteToken(apiKey.tokenInfo.id, partnerUser.id);
      await TokenService.deleteToken(serviceToken.tokenInfo.id, systemUser.id);
    });
  });

  describe('Role-based Token Creation', () => {
    it('should allow admin to create both token types', async () => {
      // Create API key
      const apiKeyRequest = {
        userId: adminUser.id,
        tokenType: 'api_key' as const,
        name: 'Admin API Key',
      };
      const apiKeyResult = await TokenService.generateToken(apiKeyRequest);

      // Create service token
      const serviceTokenRequest = {
        userId: adminUser.id,
        tokenType: 'service_token' as const,
        name: 'Admin Service Token',
      };
      const serviceTokenResult = await TokenService.generateToken(serviceTokenRequest);

      expect(apiKeyResult.tokenInfo.tokenType).toBe('api_key');
      expect(serviceTokenResult.tokenInfo.tokenType).toBe('service_token');

      // Clean up
      await TokenService.deleteToken(apiKeyResult.tokenInfo.id, adminUser.id);
      await TokenService.deleteToken(serviceTokenResult.tokenInfo.id, adminUser.id);
    });
  });
}); 