import { BaseRepositoryImpl } from './base.repository';
import { WebhookModel, WebhookDocument } from '../models/webhook.model';
import { CancellationEventType } from '../types/webhook.types';

export class WebhookRepository extends BaseRepositoryImpl<WebhookDocument> {
  constructor() {
    super(WebhookModel);
  }

  /**
   * Find webhooks by event type
   */
  async findByEvent(event: CancellationEventType): Promise<WebhookDocument[]> {
    return await this.model.find({
      events: event,
      isActive: true
    }).exec();
  }

  /**
   * Find all active webhooks
   */
  async findActiveWebhooks(): Promise<WebhookDocument[]> {
    return await this.model.find({ isActive: true }).exec();
  }

  /**
   * Find webhooks by creator
   */
  async findByCreator(createdBy: string): Promise<WebhookDocument[]> {
    return await this.model.find({ createdBy }).exec();
  }

  /**
   * Validate webhook URL format
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if webhook name already exists
   */
  async isNameExists(name: string, excludeId?: string): Promise<boolean> {
    const query: any = { name };
    if (excludeId) {
      query.id = { $ne: excludeId };
    }
    
    const count = await this.model.countDocuments(query);
    return count > 0;
  }

  /**
   * Update webhook status
   */
  async updateStatus(id: string, isActive: boolean): Promise<WebhookDocument | null> {
    return await this.model.findOneAndUpdate(
      { id },
      { isActive },
      { new: true }
    );
  }

  /**
   * Get webhook statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byEvent: Record<string, number>;
  }> {
    const total = await this.model.countDocuments();
    const active = await this.model.countDocuments({ isActive: true });
    const inactive = await this.model.countDocuments({ isActive: false });

    // Get count by event type
    const eventStats = await this.model.aggregate([
      { $unwind: '$events' },
      { $group: { _id: '$events', count: { $sum: 1 } } }
    ]);

    const byEvent: Record<string, number> = {};
    eventStats.forEach((stat: any) => {
      byEvent[stat._id] = stat.count;
    });

    return {
      total,
      active,
      inactive,
      byEvent
    };
  }
} 