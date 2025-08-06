import mongoose from 'mongoose';
import { 
  UserModel, 
  ProductModel, 
  OrderModel, 
  CancellationRecordModel 
} from '../models';
import { env } from '../config/environment';

describe('Models', () => {
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
    try {
      const testEmails = [
        'john.doe@example.com',
        'test.user@example.com',
        'test@example.com',
        'customer@example.com',
        'cancellation-test@example.com',
        'cancellation-customer@example.com'
      ];
      await UserModel.deleteMany({ email: { $in: testEmails } });
      await UserModel.deleteMany({ id: 'test-user-id' });

      const testProductIds = ['test-product-id'];
      await ProductModel.deleteMany({ id: { $in: testProductIds } });
      await ProductModel.deleteMany({ 'metadata.loungeId': { $in: ['TEST-LOUNGE-001', 'CANCEL-LOUNGE-001'] } });

      const testOrderIds = ['test-order-id'];
      const testPnrs = ['TEST-PNR-001', 'CANCEL-PNR-001'];
      const testTransactionIds = ['TEST-TXN-001', 'CANCEL-TXN-001'];
      await OrderModel.deleteMany({ id: { $in: testOrderIds } });
      await OrderModel.deleteMany({ pnr: { $in: testPnrs } });
      await OrderModel.deleteMany({ transactionId: { $in: testTransactionIds } });

      const testCancellationIds = ['test-cancellation-id'];
      await CancellationRecordModel.deleteMany({ id: { $in: testCancellationIds } });
      await CancellationRecordModel.deleteMany({ correlationId: 'CORRELATION-001' });
    } catch (error) {
      console.error('❌ Error cleaning database:', error);
    }
  });

  afterEach(async () => {
    try {
      const testEmails = [
        'john.doe@example.com',
        'test.user@example.com',
        'test@example.com',
        'customer@example.com',
        'cancellation-test@example.com',
        'cancellation-customer@example.com'
      ];
      await UserModel.deleteMany({ email: { $in: testEmails } });
      await UserModel.deleteMany({ id: 'test-user-id' });

      const testProductIds = ['test-product-id'];
      await ProductModel.deleteMany({ id: { $in: testProductIds } });
      await ProductModel.deleteMany({ 'metadata.loungeId': { $in: ['TEST-LOUNGE-001', 'CANCEL-LOUNGE-001'] } });

      const testOrderIds = ['test-order-id'];
      const testPnrs = ['TEST-PNR-001', 'CANCEL-PNR-001'];
      const testTransactionIds = ['TEST-TXN-001', 'CANCEL-TXN-001'];
      await OrderModel.deleteMany({ id: { $in: testOrderIds } });
      await OrderModel.deleteMany({ pnr: { $in: testPnrs } });
      await OrderModel.deleteMany({ transactionId: { $in: testTransactionIds } });

      const testCancellationIds = ['test-cancellation-id'];
      await CancellationRecordModel.deleteMany({ id: { $in: testCancellationIds } });
      await CancellationRecordModel.deleteMany({ correlationId: 'CORRELATION-001' });
    } catch (error) {
      console.error('❌ Error cleaning database:', error);
    }
  });

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'TestPassword123',
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser.id).toBeDefined();
      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(userData.isActive);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should have different _id and id fields', async () => {
      const userData = {
        name: 'Test User',
        email: 'test.user@example.com',
        password: 'TestPassword123',
        role: 'user' as const,
        isActive: true,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      // _id should be MongoDB ObjectId
      expect(savedUser._id).toBeDefined();
      expect(typeof (savedUser._id as any).toString()).toBe('string');
      expect((savedUser._id as any).toString().length).toBe(24); // MongoDB ObjectId length

      // id should be custom UUID
      expect(savedUser.id).toBeDefined();
      expect(typeof savedUser.id).toBe('string');
      expect(savedUser.id.length).toBe(36); // UUID v4 length
      expect(savedUser.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4 pattern

      // They should be different
      expect((savedUser._id as any).toString()).not.toBe(savedUser.id);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'TestPassword123',
        role: 'user' as const,
        isActive: true,
      };

      const user1 = new UserModel(userData);
      await user1.save();

      const user2 = new UserModel(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique id constraint', async () => {
      const userData = {
        id: 'test-user-id',
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'TestPassword123',
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
    it('should create a product with required fields', async () => {
      const productData = {
        title: 'Premium Lounge Access',
        provider: 'dragonpass',
        type: 'lounge_access' as const,
        price: {
          amount: 50.00,
          currency: 'USD',
        },
        status: 'confirmed' as const,
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
        serviceDateTime: new Date(),
        metadata: {
          loungeId: 'LOUNGE-001',
          loungeName: 'Premium Lounge',
        },
      };

      const product = new ProductModel(productData);
      const savedProduct = await product.save();

      expect(savedProduct.id).toBeDefined();
      expect(savedProduct.title).toBe(productData.title);
      expect(savedProduct.provider).toBe(productData.provider);
      expect(savedProduct.type).toBe(productData.type);
      expect(savedProduct.price.amount).toBe(productData.price.amount);
      expect(savedProduct.price.currency).toBe(productData.price.currency);
      expect(savedProduct.status).toBe(productData.status);
      expect(savedProduct.cancellationPolicy.windows).toHaveLength(1);
      expect(savedProduct.serviceDateTime).toBeDefined();
      expect(savedProduct.metadata.loungeId).toBe(productData.metadata.loungeId);
      expect(savedProduct.createdAt).toBeDefined();
      expect(savedProduct.updatedAt).toBeDefined();
    });

    it('should enforce unique id constraint', async () => {
      const productData = {
        id: 'test-product-id',
        title: 'Premium Lounge Access',
        provider: 'dragonpass',
        type: 'lounge_access' as const,
        price: {
          amount: 50.00,
          currency: 'USD',
        },
        status: 'confirmed' as const,
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
        serviceDateTime: new Date(),
      };

      const product1 = new ProductModel(productData);
      await product1.save();

      const product2 = new ProductModel(productData);
      await expect(product2.save()).rejects.toThrow();
    });
  });

  describe('Order Model', () => {
    let testUser: any;
    let testProduct: any;

    beforeEach(async () => {
      testUser = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123',
        role: 'user',
        isActive: true,
      });
      await testUser.save();

      testProduct = new ProductModel({
        title: 'Test Product',
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
          loungeId: 'TEST-LOUNGE-001',
          loungeName: 'Test Lounge',
        },
      });
      await testProduct.save();
    });

    it('should create an order with required fields', async () => {
      const orderData = {
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
        status: 'confirmed' as const,
        userId: testUser.id,
        totalAmount: 100.00,
        totalCurrency: 'USD',
        notes: 'Test order',
      };

      const order = new OrderModel(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.id).toBeDefined();
      expect(savedOrder.pnr).toBe(orderData.pnr);
      expect(savedOrder.transactionId).toBe(orderData.transactionId);
      expect(savedOrder.customer.email).toBe(orderData.customer.email);
      expect(savedOrder.products).toContain(testProduct.id);
      expect(savedOrder.segments).toHaveLength(1);
      expect(savedOrder.status).toBe(orderData.status);
      expect(savedOrder.userId).toBe(testUser.id);
      expect(savedOrder.totalAmount).toBe(orderData.totalAmount);
      expect(savedOrder.totalCurrency).toBe(orderData.totalCurrency);
      expect(savedOrder.notes).toBe(orderData.notes);
      expect(savedOrder.createdAt).toBeDefined();
      expect(savedOrder.updatedAt).toBeDefined();
    });

    it('should enforce unique transaction ID constraint', async () => {
      const orderData = {
        pnr: 'TEST-PNR-001',
        transactionId: 'TEST-TXN-001',
        customer: {
          email: 'customer@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        products: [testProduct.id],
        segments: [],
        status: 'confirmed' as const,
        userId: testUser.id,
      };

      const order1 = new OrderModel(orderData);
      await order1.save();

      const order2 = new OrderModel(orderData);
      await expect(order2.save()).rejects.toThrow();
    });

    it('should enforce unique id constraint', async () => {
      const orderData = {
        id: 'test-order-id',
        pnr: 'TEST-PNR-001',
        transactionId: 'TEST-TXN-001',
        customer: {
          email: 'customer@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        products: [testProduct.id],
        segments: [],
        status: 'confirmed' as const,
        userId: testUser.id,
      };

      const order1 = new OrderModel(orderData);
      await order1.save();

      const order2 = new OrderModel(orderData);
      await expect(order2.save()).rejects.toThrow();
    });
  });

  describe('CancellationRecord Model', () => {
    let testUser: any;
    let testProduct: any;
    let testOrder: any;

    beforeEach(async () => {
      testUser = new UserModel({
        name: 'Cancellation Test User',
        email: 'cancellation-test@example.com',
        password: 'TestPassword123',
        role: 'user',
        isActive: true,
      });
      await testUser.save();

      testProduct = new ProductModel({
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

    testOrder = new OrderModel({
        pnr: 'CANCEL-PNR-001',
        transactionId: 'CANCEL-TXN-001',
        customer: {
          email: 'cancellation-customer@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        },
        products: [testProduct.id],
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
        userId: testUser.id,
        totalAmount: 100.00,
        totalCurrency: 'USD',
        notes: 'Cancellation test order',
      });
      await testOrder.save();
    });

    it('should create a cancellation record with required fields', async () => {
      const cancellationData = {
        orderId: testOrder.id,
        productId: testProduct.id,
        reason: 'Customer request',
        requestSource: 'customer' as const,
        requestedBy: testUser.id,
        refundAmount: 100.00,
        cancellationFee: 0.00,
        currency: 'USD',
        status: 'pending' as const,
        correlationId: 'CORRELATION-001',
        notes: 'Test cancellation',
      };

      const cancellation = new CancellationRecordModel(cancellationData);
      const savedCancellation = await cancellation.save();

      expect(savedCancellation.id).toBeDefined();
      expect(savedCancellation.orderId).toBe(testOrder.id);
      expect(savedCancellation.productId).toBe(testProduct.id);
      expect(savedCancellation.reason).toBe(cancellationData.reason);
      expect(savedCancellation.requestSource).toBe(cancellationData.requestSource);
      expect(savedCancellation.requestedBy).toBe(testUser.id);
      expect(savedCancellation.refundAmount).toBe(cancellationData.refundAmount);
      expect(savedCancellation.cancellationFee).toBe(cancellationData.cancellationFee);
      expect(savedCancellation.currency).toBe(cancellationData.currency);
      expect(savedCancellation.status).toBe(cancellationData.status);
      expect(savedCancellation.correlationId).toBe(cancellationData.correlationId);
      expect(savedCancellation.notes).toBe(cancellationData.notes);
      expect(savedCancellation.cancelledAt).toBeDefined();
      expect(savedCancellation.createdAt).toBeDefined();
      expect(savedCancellation.updatedAt).toBeDefined();
    });

    it('should enforce unique id constraint', async () => {
      const cancellationData = {
        id: 'test-cancellation-id',
        orderId: testOrder.id,
        productId: testProduct.id,
        reason: 'Customer request',
        requestSource: 'customer' as const,
        requestedBy: testUser.id,
        refundAmount: 100.00,
        cancellationFee: 0.00,
        currency: 'USD',
        status: 'pending' as const,
        correlationId: 'CORRELATION-001',
      };

      const cancellation1 = new CancellationRecordModel(cancellationData);
      await cancellation1.save();

      const cancellation2 = new CancellationRecordModel(cancellationData);
      await expect(cancellation2.save()).rejects.toThrow();
    });
  });
}); 