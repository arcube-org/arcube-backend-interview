import mongoose from 'mongoose';
import { CancellationService } from '../services/cancellation/cancellation.service';
import { ProductModel } from '../models';
import { CancellationRepository } from '../repositories/cancellation.repository';
import { env } from '../config/environment';

describe('Cancellation Undo Functionality', () => {
  let cancellationService: CancellationService;
  let cancellationRepository: CancellationRepository;

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
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }

    cancellationService = new CancellationService();
    cancellationRepository = new CancellationRepository();
  });

  describe('Undo Mechanism', () => {
    it('should allow manual undo of failed cancellations', async () => {
      // Create a test product
      const testProduct = new ProductModel({
        id: 'test-product-456',
        title: 'Test Product',
        provider: 'dragonpass',
        type: 'lounge_access',
        price: { amount: 50, currency: 'USD' },
        status: 'confirmed',
        cancellationPolicy: {
          windows: [
            {
              hoursBeforeService: 24,
              refundPercentage: 100,
              description: 'Full refund up to 24 hours before service'
            }
          ],
          canCancel: true
        },
        serviceDateTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        metadata: {
          bookingId: 'test-booking-456',
          loungeId: 'test-lounge-789'
        }
      });

      await testProduct.save();

      // Create a failed cancellation record
      const cancellationRecord = await cancellationRepository.create({
        orderId: 'test-order-456',
        productId: 'test-product-456',
        reason: 'Test failed cancellation',
        requestedBy: 'test-user',
        requestSource: 'admin',
        refundAmount: 0,
        cancellationFee: 50,
        currency: 'USD',
        status: 'failed',
        correlationId: 'test-correlation-456',
        originalProductStatus: 'confirmed'
      });

      // Manually undo the cancellation
      const undoResult = await cancellationService.undoCancellation('test-correlation-456');
      expect(undoResult).toBe(true);

      // Verify the cancellation record status was updated
      const updatedRecord = await cancellationRepository.findById(cancellationRecord.id);
      expect(updatedRecord?.status).toBe('undone');

      // Clean up
      await ProductModel.deleteOne({ id: 'test-product-456' });
      await cancellationRepository.deleteById(cancellationRecord.id);
    });

    it('should track original product status in cancellation records', async () => {
      // Create a test product
      const testProduct = new ProductModel({
        id: 'test-product-789',
        title: 'Test Product',
        provider: 'dragonpass',
        type: 'lounge_access',
        price: { amount: 50, currency: 'USD' },
        status: 'confirmed',
        cancellationPolicy: {
          windows: [
            {
              hoursBeforeService: 24,
              refundPercentage: 100,
              description: 'Full refund up to 24 hours before service'
            }
          ],
          canCancel: true
        },
        serviceDateTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        metadata: {
          bookingId: 'test-booking-789',
          loungeId: 'test-lounge-123'
        }
      });

      await testProduct.save();

      // Create a cancellation record with original status
      const cancellationRecord = await cancellationRepository.create({
        orderId: 'test-order-789',
        productId: 'test-product-789',
        reason: 'Test cancellation',
        requestedBy: 'test-user',
        requestSource: 'admin',
        refundAmount: 0,
        cancellationFee: 50,
        currency: 'USD',
        status: 'pending',
        correlationId: 'test-correlation-789',
        originalProductStatus: 'confirmed'
      });

      // Verify that the original status is tracked
      expect(cancellationRecord.originalProductStatus).toBe('confirmed');

      // Clean up
      await ProductModel.deleteOne({ id: 'test-product-789' });
      await cancellationRepository.deleteById(cancellationRecord.id);
    });
  });
}); 