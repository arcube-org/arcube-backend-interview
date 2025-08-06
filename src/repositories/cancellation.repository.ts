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
        updateData.externalProviderResponse = response;
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
} 