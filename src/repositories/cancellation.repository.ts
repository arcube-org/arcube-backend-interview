import { BaseRepositoryImpl } from './base.repository';
import { CancellationRecordModel, CancellationRecordDocument } from '../models';

export class CancellationRepository extends BaseRepositoryImpl<CancellationRecordDocument> {
  constructor() {
    super(CancellationRecordModel);
  }

  async createCancellationRequest(data: Partial<CancellationRecordDocument>): Promise<CancellationRecordDocument> {
    try {
      const cancellation = new this.model({
        ...data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return await cancellation.save();
    } catch (error) {
      throw new Error(`Failed to create cancellation request: ${error}`);
    }
  }

  async updateCancellationStatus(id: string, status: string, response?: any): Promise<CancellationRecordDocument | null> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (response) {
        // If response is a string, store it as notes instead of externalProviderResponse
        if (typeof response === 'string') {
          updateData.notes = response;
        } else {
          // If response is an object, store it as externalProviderResponse
          updateData.externalProviderResponse = response;
        }
      }

      return await this.model.findOneAndUpdate({ id }, updateData, { new: true });
    } catch (error) {
      throw new Error(`Failed to update cancellation status: ${error}`);
    }
  }

  async findPendingCancellations(): Promise<CancellationRecordDocument[]> {
    try {
      return await this.model.find({ status: 'pending' })
        .sort({ createdAt: 1 });
    } catch (error) {
      throw new Error(`Failed to find pending cancellations: ${error}`);
    }
  }

  async findByCorrelationId(correlationId: string): Promise<CancellationRecordDocument | null> {
    try {
      return await this.model.findOne({ correlationId });
    } catch (error) {
      throw new Error(`Failed to find cancellation by correlation ID: ${error}`);
    }
  }

  async findByProductId(productId: string): Promise<CancellationRecordDocument[]> {
    try {
      return await this.model.find({ productId });
    } catch (error) {
      throw new Error(`Failed to find cancellations by product ID: ${error}`);
    }
  }

  async deleteByProductId(productId: string): Promise<void> {
    try {
      await this.model.deleteMany({ productId });
    } catch (error) {
      throw new Error(`Failed to delete cancellations by product ID: ${error}`);
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.model.deleteOne({ id });
    } catch (error) {
      throw new Error(`Failed to delete cancellation by ID: ${error}`);
    }
  }
} 