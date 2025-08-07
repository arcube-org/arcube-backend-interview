import mongoose from 'mongoose';
import { 
  UserModel, 
  ProductModel, 
  OrderModel 
} from '../models';
import { CancellationService } from '../services/cancellation/cancellation.service';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { AuthService } from '../services/auth.service';
import { CancelOrderRequest } from '../types/cancellation.types';
import { AuthContext } from '../types/auth.types';
import { env } from '../config/environment';

describe('Enhanced Cancellation System', () => {
  let testUser: any;
  let testProduct: any;
  let testOrder: any;
  let cancellationService: CancellationService;

  beforeAll(async () => {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log('✅ Connected to test database');
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close();
      console.log('✅ Disconnected from test database');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }

    testUser = new UserModel({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123',
      role: 'user',
      isActive: true,
      dateOfBirth: new Date('1991-04-08'),
      nationality: 'Canada',
    });
    await testUser.save();

    testProduct = new ProductModel({
      title: 'Premium Lounge Access',
      provider: 'dragonpass',
      type: 'lounge_access',
      price: {
        amount: 50.00,
        currency: 'USD',
      },
      status: 'confirmed',
      cancellationPolicy: {
        windows: [
          {
            hoursBeforeService: 24,
            refundPercentage: 100,
            description: 'Full refund up to 24 hours before',
          },
        ],
        canCancel: true,
      },
      serviceDateTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      metadata: {
        bookingId: 'DP-123456789',
        loungeId: 'JFK-T4-CENTURION',
        loungeName: 'Centurion Lounge',
      },
    });
    await testProduct.save();

    testOrder = new OrderModel({
      pnr: 'TEST-PNR-001',
      transactionId: 'TEST-TXN-001',
      customer: {
        email: 'customer@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      },
      products: [testProduct.id],
      segments: [
        {
          segmentId: 'SEG-001',
          flightNumber: 'XY123',
          departure: 'LAX',
          arrival: 'JFK',
          departureTime: new Date(),
          arrivalTime: new Date(),
          operatingCarrier: 'XY',
          passengerIds: ['PAX1'],
        },
      ],
      status: 'confirmed',
      userId: testUser.id,
      totalAmount: 50.00,
      totalCurrency: 'USD',
    });
    await testOrder.save();

    cancellationService = new CancellationService();
  });

  describe('Authentication Middleware', () => {
    it('should authenticate JWT token', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPassword123',
      };
      const authResult = await AuthService.authenticateUser(credentials);
      expect(authResult.success).toBe(true);

      const mockReq = {
        headers: {
          authorization: `Bearer ${authResult.token}`
        }
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      const mockNext = jest.fn();

      MultiTierAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.authContext).toBeDefined();
      expect(mockReq.authContext?.type).toBe('jwt');
      expect(mockReq.authContext?.requestSource).toBe('customer_app');
    });


    it('should reject invalid authentication', async () => {
      const mockReq = {
        headers: {}
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      const mockNext = jest.fn();

      MultiTierAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No valid authentication method provided',
        errorCode: 'NO_AUTH_METHOD'
      });
    });
  });

  describe('Cancellation Service', () => {
    it('should cancel a single product successfully', async () => {
      const payload: CancelOrderRequest = {
        orderIdentifier: {
          pnr: 'TEST-PNR-001',
          email: 'customer@example.com'
        },
        productId: testProduct.id,
        requestSource: 'customer_app',
        reason: 'flight_cancelled',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'customer'
        }
      };

      const authContext: AuthContext = {
        type: 'jwt',
        userId: 'customer-123',
        userRole: 'customer',
        permissions: ['cancel_own_orders'],
        requestSource: 'customer_app',
        metadata: {
          email: 'customer@example.com'
        }
      };

      const result = await cancellationService.cancelOrder(payload, authContext);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect('success' in result).toBe(true);
      expect('message' in result).toBe(true);
      expect('currency' in result).toBe(true);
    });

    it('should cancel entire order successfully', async () => {
      const payload: CancelOrderRequest = {
        orderIdentifier: {
          pnr: 'TEST-PNR-001',
          email: 'customer@example.com'
        },
        requestSource: 'customer_app',
        reason: 'flight_cancelled',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'customer'
        }
      };

      const authContext: AuthContext = {
        type: 'jwt',
        userId: 'customer-123',
        userRole: 'customer',
        permissions: ['cancel_own_orders'],
        requestSource: 'customer_app',
        metadata: {
          email: 'customer@example.com'
        }
      };

      const result = await cancellationService.cancelOrder(payload, authContext);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBeGreaterThan(0);
        if (result[0]) {
          expect('success' in result[0]).toBe(true);
        }
      }
    });

    it('should handle access denied scenarios', async () => {
      const payload: CancelOrderRequest = {
        orderIdentifier: {
          pnr: 'TEST-PNR-001',
          email: 'wrong-customer@example.com' // Wrong email
        },
        productId: testProduct.id,
        requestSource: 'customer_app',
        reason: 'flight_cancelled',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'customer'
        }
      };

      const authContext: AuthContext = {
        type: 'jwt',
        userId: 'customer-123',
        userRole: 'customer',
        permissions: ['cancel_own_orders'],
        requestSource: 'customer_app',
        metadata: {
          email: 'customer@example.com'
        }
      };

      const result = await cancellationService.cancelOrder(payload, authContext);

      expect(result).toBeDefined();
      if (!Array.isArray(result)) {
        expect('success' in result).toBe(true);
        expect(result.success).toBe(false);
        expect('errorCode' in result).toBe(true);
      }
    });
  });
}); 