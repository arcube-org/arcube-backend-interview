import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { 
  CancellationEvent, 
  CancellationEventType, 
  WebhookDeliveryStatus,
  WebhookPayload 
} from '../types/webhook.types';
import { WebhookDocument } from '../models/webhook.model';
import { WebhookEventDocument } from '../models/webhook-event.model';
import crypto from 'crypto';

/**
 * Webhook Dispatcher Service
 * Handles webhook delivery with retry logic and error handling
 */
export class WebhookDispatcherService {
  private webhookRepository: WebhookRepository;
  private webhookEventRepository: WebhookEventRepository;

  constructor() {
    this.webhookRepository = new WebhookRepository();
    this.webhookEventRepository = new WebhookEventRepository();
  }

  /**
   * Dispatch an event to all registered webhooks
   */
  async dispatchEvent(event: CancellationEvent): Promise<void> {
    try {
      // Find all webhooks subscribed to this event type
      const webhooks = await this.webhookRepository.findByEvent(event.type);
      
      if (webhooks.length === 0) {
        console.log(`No webhooks registered for event type: ${event.type}`);
        return;
      }

      console.log(`Dispatching event ${event.type} to ${webhooks.length} webhooks`);

      // Create webhook events for each webhook
      const webhookEvents = webhooks.map(webhook => 
        this.createWebhookEvent(webhook, event)
      );

      // Save all webhook events
      await Promise.all(webhookEvents.map(event => 
        this.webhookEventRepository.create(event)
      ));

      // Process pending events
      await this.processPendingEvents();

    } catch (error) {
      console.error('Error dispatching event:', error);
      throw error;
    }
  }

  /**
   * Process all pending webhook events
   */
  async processPendingEvents(): Promise<void> {
    try {
      const pendingEvents = await this.webhookEventRepository.findPendingEvents();
      
      if (pendingEvents.length === 0) {
        return;
      }

      console.log(`Processing ${pendingEvents.length} pending webhook events`);

      // Process events concurrently with a limit
      const batchSize = 5;
      for (let i = 0; i < pendingEvents.length; i += batchSize) {
        const batch = pendingEvents.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(event => this.processWebhookEvent(event))
        );
      }

    } catch (error) {
      console.error('Error processing pending events:', error);
      throw error;
    }
  }

  /**
   * Retry failed webhook events
   */
  async retryFailedEvents(): Promise<void> {
    try {
      const failedEvents = await this.webhookEventRepository.findFailedEvents();
      
      if (failedEvents.length === 0) {
        return;
      }

      console.log(`Retrying ${failedEvents.length} failed webhook events`);

      // Process failed events
      await Promise.allSettled(
        failedEvents.map(event => this.processWebhookEvent(event))
      );

    } catch (error) {
      console.error('Error retrying failed events:', error);
      throw error;
    }
  }

  /**
   * Process a single webhook event
   */
  private async processWebhookEvent(webhookEvent: WebhookEventDocument): Promise<void> {
    try {
      // Get the webhook details
      const webhook = await this.webhookRepository.findById(webhookEvent.webhookId);
      if (!webhook || !webhook.isActive) {
        await this.webhookEventRepository.updateDeliveryStatus(
          webhookEvent.id,
          WebhookDeliveryStatus.FAILED,
          'Webhook not found or inactive'
        );
        return;
      }

      // Check if we should retry
      if (webhookEvent.attempts >= webhook.retryConfig.maxRetries) {
        await this.webhookEventRepository.updateDeliveryStatus(
          webhookEvent.id,
          WebhookDeliveryStatus.FAILED,
          `Max retries (${webhook.retryConfig.maxRetries}) exceeded`
        );
        return;
      }

      // Send the webhook
      await this.sendWebhook(webhook, webhookEvent);

    } catch (error) {
      console.error(`Error processing webhook event ${webhookEvent.id}:`, error);
      
      // Update status to retrying or failed
      const status = webhookEvent.attempts >= webhookEvent.attempts 
        ? WebhookDeliveryStatus.FAILED 
        : WebhookDeliveryStatus.RETRYING;
      
      await this.webhookEventRepository.updateDeliveryStatus(
        webhookEvent.id,
        status,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Send webhook to the target URL
   */
  private async sendWebhook(webhook: WebhookDocument, webhookEvent: WebhookEventDocument): Promise<void> {
    const payload: WebhookPayload = {
      event: {
        type: webhookEvent.eventType as CancellationEventType,
        data: webhookEvent.payload,
        timestamp: webhookEvent.createdAt,
        correlationId: webhookEvent.correlationId
      },
      timestamp: Date.now()
    };

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = this.generateHmacSignature(payload, webhook.secret);
      payload.signature = signature;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Arcube-Webhook-Dispatcher/1.0',
      'X-Webhook-Id': webhook.id,
      'X-Event-Type': webhookEvent.eventType,
      'X-Correlation-Id': webhookEvent.correlationId
    };

    // Add custom headers
    if (webhook.headers) {
      Object.assign(headers, webhook.headers);
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.ok) {
      await this.webhookEventRepository.updateDeliveryStatus(
        webhookEvent.id,
        WebhookDeliveryStatus.DELIVERED
      );
      console.log(`Webhook ${webhook.id} delivered successfully`);
    } else {
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      await this.webhookEventRepository.updateDeliveryStatus(
        webhookEvent.id,
        WebhookDeliveryStatus.RETRYING,
        errorMessage
      );
      throw new Error(errorMessage);
    }
  }

  /**
   * Create webhook event document
   */
  private createWebhookEvent(webhook: WebhookDocument, event: CancellationEvent): Partial<WebhookEventDocument> {
    return {
      webhookId: webhook.id,
      eventType: event.type,
      payload: event.data,
      status: WebhookDeliveryStatus.PENDING,
      attempts: 0,
      correlationId: event.correlationId
    };
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateHmacSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload.event);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats() {
    return await this.webhookEventRepository.getDeliveryStats();
  }

  /**
   * Clean up old events
   */
  async cleanupOldEvents(daysOld: number = 30): Promise<number> {
    return await this.webhookEventRepository.cleanupOldEvents(daysOld);
  }
} 