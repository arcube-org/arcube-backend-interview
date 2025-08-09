import { BaseRepositoryImpl } from './base.repository';
import { WebhookEventModel, WebhookEventDocument } from '../models/webhook-event.model';
import { CancellationEventType, WebhookDeliveryStatus } from '../types/webhook.types';

export class WebhookEventRepository extends BaseRepositoryImpl<WebhookEventDocument> {
  constructor() {
    super(WebhookEventModel);
  }

  /**
   * Find pending webhook events
   */
  async findPendingEvents(): Promise<WebhookEventDocument[]> {
    return await this.model.find({
      status: WebhookDeliveryStatus.PENDING
    }).sort({ createdAt: 1 }).exec();
  }

  /**
   * Find failed webhook events
   */
  async findFailedEvents(): Promise<WebhookEventDocument[]> {
    return await this.model.find({
      status: WebhookDeliveryStatus.FAILED
    }).sort({ lastAttemptAt: 1 }).exec();
  }

  /**
   * Find events by webhook ID
   */
  async findByWebhookId(webhookId: string): Promise<WebhookEventDocument[]> {
    return await this.model.find({ webhookId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find events by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<WebhookEventDocument[]> {
    return await this.model.find({ correlationId }).sort({ createdAt: 1 }).exec();
  }

  /**
   * Find events by event type
   */
  async findByEventType(eventType: CancellationEventType): Promise<WebhookEventDocument[]> {
    return await this.model.find({ eventType }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    id: string, 
    status: WebhookDeliveryStatus, 
    errorMessage?: string
  ): Promise<WebhookEventDocument | null> {
    const updateData: any = {
      status,
      lastAttemptAt: new Date(),
      attempts: { $inc: 1 }
    };

    if (status === WebhookDeliveryStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return await this.model.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    );
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    retrying: number;
    successRate: number;
  }> {
    const total = await this.model.countDocuments();
    const pending = await this.model.countDocuments({ status: WebhookDeliveryStatus.PENDING });
    const delivered = await this.model.countDocuments({ status: WebhookDeliveryStatus.DELIVERED });
    const failed = await this.model.countDocuments({ status: WebhookDeliveryStatus.FAILED });
    const retrying = await this.model.countDocuments({ status: WebhookDeliveryStatus.RETRYING });

    const successRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      total,
      pending,
      delivered,
      failed,
      retrying,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Clean up old events (older than specified days)
   */
  async cleanupOldEvents(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.model.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: [WebhookDeliveryStatus.DELIVERED, WebhookDeliveryStatus.FAILED] }
    });

    return result.deletedCount || 0;
  }
} 