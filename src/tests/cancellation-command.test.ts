import mongoose from 'mongoose';
import { 
  UserModel, 
  ProductModel, 
  OrderModel 
} from '../models';
import { CancellationCommandFactory } from '../commands/cancellation/factory/cancellation-command-factory';
import { CancellationCommandInvoker } from '../commands/cancellation/invoker/cancellation-command-invoker';
import { env } from '../config/environment';

describe('Cancellation Command Pattern', () => {
  let testUser: any;
  let testProduct: any;
  let testOrder: any;

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
    await UserModel.deleteMany({ email: 'test@example.com' });
    await ProductModel.deleteMany({ 'metadata.bookingId': 'DP-123456789' });
    await OrderModel.deleteMany({ pnr: 'TEST-PNR-001', transactionId: 'TEST-TXN-001' });

    testUser = new UserModel({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123',
      role: 'user',
      isActive: true,
      dateOfBirth: new Date('1990-01-15'),
      nationality: 'United States',
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
          {
            hoursBeforeService: 4,
            refundPercentage: 50,
            description: '50% refund up to 4 hours before',
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
  });

  describe('Command Factory', () => {
    it('should create DragonPass command for dragonpass provider', () => {
      const context = {
        orderId: testOrder.id,
        productId: testProduct.id,
        reason: 'Customer request',
        requestedBy: testUser.id,
        requestSource: 'customer' as const,
        correlationId: 'test-correlation-id',
      };

      const command = CancellationCommandFactory.createCommand('dragonpass', context);
      
      expect(command.getProvider()).toBe('dragonpass');
      expect(command.getCommandType()).toBe('DragonPassCancellationCommand');
    });

    it('should create Mozio command for mozio provider', () => {
      const context = {
        orderId: testOrder.id,
        productId: testProduct.id,
        reason: 'Customer request',
        requestedBy: testUser.id,
        requestSource: 'customer' as const,
        correlationId: 'test-correlation-id',
      };

      const command = CancellationCommandFactory.createCommand('mozio', context);
      
      expect(command.getProvider()).toBe('mozio');
      expect(command.getCommandType()).toBe('MozioCancellationCommand');
    });

    it('should create default command for unknown provider', () => {
      const context = {
        orderId: testOrder.id,
        productId: testProduct.id,
        reason: 'Customer request',
        requestedBy: testUser.id,
        requestSource: 'customer' as const,
        correlationId: 'test-correlation-id',
      };

      const command = CancellationCommandFactory.createCommand('unknown-provider', context);
      
      expect(command.getProvider()).toBe('unknown-provider');
      expect(command.getCommandType()).toBe('DefaultCancellationCommand');
    });
  });

  describe('Command Invoker', () => {
    it('should execute command and maintain audit trail', async () => {
      const invoker = new CancellationCommandInvoker();
      
      const context = {
        orderId: testOrder.id,
        productId: testProduct.id,
        reason: 'Customer request',
        requestedBy: testUser.id,
        requestSource: 'customer' as const,
        correlationId: 'test-correlation-id',
      };

      const command = CancellationCommandFactory.createCommand('dragonpass', context);
      const result = await invoker.executeCommand(command);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.message).toBeDefined();

      const auditTrail = invoker.getAuditTrail();
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0]?.provider).toBe('dragonpass');
      expect(auditTrail[0]?.correlationId).toBe('test-correlation-id');
    });
  });
}); 