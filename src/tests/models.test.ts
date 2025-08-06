// Jest tests for models
import mongoose from 'mongoose';
import { 
  UserModel, 
  ProductModel, 
  OrderModel, 
  CancellationRecordModel 
} from '../models';
import { env } from '../config/environment';

describe('Models', () => {
  // Database connection setup
  beforeAll(async () => {
    try {
      // Connect to test database
      await mongoose.connect(env.MONGODB_URI);
      console.log('✅ Connected to test database');
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Close database connection
      await mongoose.connection.close();
      console.log('✅ Disconnected from test database');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  });

  // Clean up database before and after each test
  beforeEach(async () => {
    try {
      // Clear all collections
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        if (collection) {
          await collection.deleteMany({});
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning database:', error);
    }
  });

  afterEach(async () => {
    try {
      // Clear all collections after each test
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        if (collection) {
          await collection.deleteMany({});
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning database:', error);
    }
  });
  describe('User Model', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'valid-user-test@example.com',
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(userData.isActive);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should fail to create user with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should fail to create user with duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate-email-test@example.com',
        role: 'user' as const,
        isActive: true,
      };

      const user1 = new UserModel(userData);
      await user1.save();

      const user2 = new UserModel(userData);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Product Model', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        id: 'TEST-PROD-001',
        title: 'Test Product',
        provider: 'dragonpass',
        type: 'lounge_access' as const,
        price: {
          amount: 50.00,
          currency: 'USD',
        },
        status: 'pending' as const,
        cancellationPolicy: {
          windows: [
            {
              hoursBeforeService: 24,
              refundPercentage: 100,
              description: 'Full refund',
            },
          ],
          canCancel: true,
        },
        serviceDateTime: new Date(),
        metadata: {
          loungeId: 'TEST-LOUNGE-001',
          loungeName: 'Test Lounge',
        },
      };

      const product = new ProductModel(productData);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.id).toBe(productData.id);
      expect(savedProduct.title).toBe(productData.title);
      expect(savedProduct.provider).toBe(productData.provider);
      expect(savedProduct.type).toBe(productData.type);
      expect(savedProduct.price.amount).toBe(productData.price.amount);
      expect(savedProduct.price.currency).toBe(productData.price.currency);
      expect(savedProduct.cancellationPolicy.windows).toHaveLength(1);
      expect(savedProduct.createdAt).toBeDefined();
      expect(savedProduct.updatedAt).toBeDefined();
    });

    it('should fail to create product with invalid price', async () => {
      const productData = {
        id: 'TEST-PROD-002',
        title: 'Test Product',
        provider: 'dragonpass',
        type: 'lounge_access' as const,
        price: {
          amount: -50.00, // Invalid negative price
          currency: 'USD',
        },
        status: 'pending' as const,
        cancellationPolicy: {
          windows: [],
          canCancel: true,
        },
        serviceDateTime: new Date(),
        metadata: {},
      };

      const product = new ProductModel(productData);
      await expect(product.save()).rejects.toThrow();
    });
  });

  describe('Order Model', () => {
    let testUser: any;
    let testProduct: any;

    beforeEach(async () => {
      // Create test user
      testUser = new UserModel({
        name: 'Order Test User',
        email: 'order-test@example.com',
        role: 'user',
        isActive: true,
      });
      await testUser.save();

      // Create test product
      testProduct = new ProductModel({
        id: 'ORDER-PROD-001',
        title: 'Order Test Product',
        provider: 'dragonpass',
        type: 'lounge_access',
        price: {
          amount: 75.00,
          currency: 'USD',
        },
        status: 'confirmed',
        cancellationPolicy: {
          windows: [
            {
              hoursBeforeService: 24,
              refundPercentage: 100,
              description: 'Full refund',
            },
          ],
          canCancel: true,
        },
        serviceDateTime: new Date(),
        metadata: {
          loungeId: 'ORDER-LOUNGE-001',
          loungeName: 'Order Test Lounge',
        },
      });
      await testProduct.save();
    });

    it('should create an order with valid data', async () => {
      const orderData = {
        pnr: 'ORDER-PNR-001',
        transactionId: 'ORDER-TXN-001',
        customer: {
          email: 'customer@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        },
        products: [testProduct._id],
        segments: [
          {
            segmentId: 'SEG-001',
            flightNumber: 'XY123',
            departure: 'JFK',
            arrival: 'LAX',
            departureTime: new Date(),
            arrivalTime: new Date(),
            operatingCarrier: 'XY',
            passengerIds: ['PAX1'],
          },
        ],
        status: 'confirmed' as const,
        userId: testUser._id,
        totalAmount: 75.00,
        totalCurrency: 'USD',
        notes: 'Test order',
      };

      const order = new OrderModel(orderData);
      const savedOrder = await order.save();

      expect(savedOrder._id).toBeDefined();
      expect(savedOrder.pnr).toBe(orderData.pnr);
      expect(savedOrder.transactionId).toBe(orderData.transactionId);
      expect(savedOrder.customer.email).toBe(orderData.customer.email);
      expect(savedOrder.customer.firstName).toBe(orderData.customer.firstName);
      expect(savedOrder.customer.lastName).toBe(orderData.customer.lastName);
      expect(savedOrder.products).toHaveLength(1);
      expect(savedOrder.segments).toHaveLength(1);
      expect(savedOrder.status).toBe(orderData.status);
      expect(savedOrder.totalAmount).toBe(orderData.totalAmount);
      expect(savedOrder.totalCurrency).toBe(orderData.totalCurrency);
      expect(savedOrder.createdAt).toBeDefined();
      expect(savedOrder.updatedAt).toBeDefined();
    });

    it('should populate products and user when querying', async () => {
      const orderData = {
        pnr: 'ORDER-PNR-002',
        transactionId: 'ORDER-TXN-002',
        customer: {
          email: 'customer2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        products: [testProduct._id],
        segments: [],
        status: 'confirmed' as const,
        userId: testUser._id,
        totalAmount: 75.00,
        totalCurrency: 'USD',
      };

      const order = new OrderModel(orderData);
      await order.save();

      const foundOrder = await OrderModel.findOne({ pnr: 'ORDER-PNR-002' })
        .populate('products')
        .populate('userId', 'name email');

      expect(foundOrder).toBeDefined();
      expect(foundOrder?.products[0]).toBeDefined();
      expect(foundOrder?.userId).toBeDefined();
    });
  });

  describe('CancellationRecord Model', () => {
    let testUser: any;
    let testProduct: any;
    let testOrder: any;

    beforeEach(async () => {
      // Create test user
      testUser = new UserModel({
        name: 'Cancellation Test User',
        email: 'cancellation-test@example.com',
        role: 'user',
        isActive: true,
      });
      await testUser.save();

      // Create test product
      testProduct = new ProductModel({
        id: 'CANCEL-PROD-001',
        title: 'Cancellation Test Product',
        provider: 'dragonpass',
        type: 'lounge_access',
        price: {
          amount: 100.00,
          currency: 'USD',
        },
        status: 'confirmed',
        cancellationPolicy: {
          windows: [
            {
              hoursBeforeService: 24,
              refundPercentage: 100,
              description: 'Full refund',
            },
          ],
          canCancel: true,
        },
        serviceDateTime: new Date(),
        metadata: {
          loungeId: 'CANCEL-LOUNGE-001',
          loungeName: 'Cancellation Test Lounge',
        },
      });
      await testProduct.save();

      // Create test order
      testOrder = new OrderModel({
        pnr: 'CANCEL-PNR-001',
        transactionId: 'CANCEL-TXN-001',
        customer: {
          email: 'cancellation-customer@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        },
        products: [testProduct._id],
        segments: [
          {
            segmentId: 'CANCEL-SEG-001',
            flightNumber: 'XY456',
            departure: 'LAX',
            arrival: 'JFK',
            departureTime: new Date(),
            arrivalTime: new Date(),
            operatingCarrier: 'XY',
            passengerIds: ['PAX1'],
          },
        ],
        status: 'confirmed',
        userId: testUser._id,
        totalAmount: 100.00,
        totalCurrency: 'USD',
        notes: 'Cancellation test order',
      });
      await testOrder.save();
    });



    it('should create a cancellation record with valid data', async () => {
      const cancellationData = {
        orderId: testOrder._id,
        productId: 'CANCEL-PROD-001',
        reason: 'Customer request',
        requestSource: 'customer' as const,
        requestedBy: testUser._id,
        refundAmount: 100.00,
        cancellationFee: 0,
        currency: 'USD',
        status: 'completed' as const,
        correlationId: 'test-correlation-001',
        cancelledAt: new Date(),
      };

      const cancellation = new CancellationRecordModel(cancellationData);
      const savedCancellation = await cancellation.save();

      expect(savedCancellation._id).toBeDefined();
      expect(savedCancellation.orderId.toString()).toBe(testOrder._id.toString());
      expect(savedCancellation.productId).toBe(cancellationData.productId);
      expect(savedCancellation.reason).toBe(cancellationData.reason);
      expect(savedCancellation.requestSource).toBe(cancellationData.requestSource);
      expect(savedCancellation.requestedBy.toString()).toBe(testUser._id.toString());
      expect(savedCancellation.refundAmount).toBe(cancellationData.refundAmount);
      expect(savedCancellation.cancellationFee).toBe(cancellationData.cancellationFee);
      expect(savedCancellation.currency).toBe(cancellationData.currency);
      expect(savedCancellation.status).toBe(cancellationData.status);
      expect(savedCancellation.correlationId).toBe(cancellationData.correlationId);
      expect(savedCancellation.cancelledAt).toBeDefined();
      expect(savedCancellation.createdAt).toBeDefined();
      expect(savedCancellation.updatedAt).toBeDefined();
    });
  });
}); 