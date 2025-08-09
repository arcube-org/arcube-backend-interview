import { WebhookRepository } from '../repositories/webhook.repository';
import { 
  WebhookRegistration, 
  CreateWebhookRequest, 
  UpdateWebhookRequest, 
  TestWebhookResult,
  CancellationEventType 
} from '../types/webhook.types';
import { WebhookDocument } from '../models/webhook.model';
import crypto from 'crypto';

/**
 * Webhook Registry Service
 * Manages webhook registrations and provides CRUD operations
 */
export class WebhookRegistryService {
  private webhookRepository: WebhookRepository;

  constructor() {
    this.webhookRepository = new WebhookRepository();
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(request: CreateWebhookRequest, createdBy: string): Promise<WebhookRegistration> {
    // Validate URL format
    const isValidUrl = await this.webhookRepository.validateUrl(request.url);
    if (!isValidUrl) {
      throw new Error('Invalid webhook URL format');
    }

    // Check if name already exists
    const nameExists = await this.webhookRepository.isNameExists(request.name);
    if (nameExists) {
      throw new Error('Webhook name already exists');
    }

    // Validate events
    if (!request.events || request.events.length === 0) {
      throw new Error('At least one event must be specified');
    }

    // Create webhook document
    const webhookData: Partial<WebhookDocument> = {
      name: request.name,
      url: request.url,
      events: request.events,
      headers: request.headers || {},
      retryConfig: {
        maxRetries: request.retryConfig?.maxRetries || 3,
        retryDelay: request.retryConfig?.retryDelay || 5000,
        backoffMultiplier: request.retryConfig?.backoffMultiplier || 2
      },
      createdBy
    };

    // Only add secret if provided
    if (request.secret) {
      webhookData.secret = request.secret;
    }

    const webhook = await this.webhookRepository.create(webhookData);
    
    return this.mapToWebhookRegistration(webhook);
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(createdBy?: string): Promise<WebhookRegistration[]> {
    let webhooks: WebhookDocument[];
    
    if (createdBy) {
      webhooks = await this.webhookRepository.findByCreator(createdBy);
    } else {
      webhooks = await this.webhookRepository.findActiveWebhooks();
    }

    return webhooks.map(webhook => this.mapToWebhookRegistration(webhook));
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(id: string): Promise<WebhookRegistration | null> {
    const webhook = await this.webhookRepository.findById(id);
    return webhook ? this.mapToWebhookRegistration(webhook) : null;
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: string, updates: UpdateWebhookRequest): Promise<WebhookRegistration> {
    // Check if webhook exists
    const existingWebhook = await this.webhookRepository.findById(id);
    if (!existingWebhook) {
      throw new Error('Webhook not found');
    }

    // Validate URL if provided
    if (updates.url) {
      const isValidUrl = await this.webhookRepository.validateUrl(updates.url);
      if (!isValidUrl) {
        throw new Error('Invalid webhook URL format');
      }
    }

    // Check if name already exists (excluding current webhook)
    if (updates.name) {
      const nameExists = await this.webhookRepository.isNameExists(updates.name, id);
      if (nameExists) {
        throw new Error('Webhook name already exists');
      }
    }

    // Validate events if provided
    if (updates.events && updates.events.length === 0) {
      throw new Error('At least one event must be specified');
    }

    // Prepare update data
    const updateData: Partial<WebhookDocument> = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.url) updateData.url = updates.url;
    if (updates.events) updateData.events = updates.events;
    if (updates.headers !== undefined) updateData.headers = updates.headers;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.secret !== undefined) updateData.secret = updates.secret;
    
    if (updates.retryConfig) {
      updateData.retryConfig = {
        maxRetries: updates.retryConfig.maxRetries || existingWebhook.retryConfig.maxRetries,
        retryDelay: updates.retryConfig.retryDelay || existingWebhook.retryConfig.retryDelay,
        backoffMultiplier: updates.retryConfig.backoffMultiplier || existingWebhook.retryConfig.backoffMultiplier
      };
    }

    const updatedWebhook = await this.webhookRepository.update(id, updateData);
    if (!updatedWebhook) {
      throw new Error('Failed to update webhook');
    }

    return this.mapToWebhookRegistration(updatedWebhook);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.webhookRepository.findById(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Use the repository's model through bracket notation to bypass protected access
    await (this.webhookRepository as any).model.deleteOne({ id });
  }

  /**
   * Test webhook by sending a test event
   */
  async testWebhook(id: string): Promise<TestWebhookResult> {
    const webhook = await this.webhookRepository.findById(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (!webhook.isActive) {
      throw new Error('Webhook is inactive');
    }

    const startTime = Date.now();
    
    try {
      // Create test payload
      const testPayload: any = {
        event: {
          type: CancellationEventType.CANCELLATION_STARTED,
          data: {
            test: true,
            message: 'This is a test webhook event',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date(),
          correlationId: `test-${Date.now()}`
        },
        timestamp: Date.now()
      };

      // Add HMAC signature if secret is configured
      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(testPayload.event))
          .digest('hex');
        testPayload.signature = signature;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Arcube-Webhook-Tester/1.0',
        'X-Webhook-Id': webhook.id,
        'X-Event-Type': CancellationEventType.CANCELLATION_STARTED,
        'X-Test-Event': 'true'
      };

      // Add custom headers
      if (webhook.headers) {
        Object.assign(headers, webhook.headers);
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      const result: TestWebhookResult = {
        success: response.ok,
        statusCode: response.status,
        responseTime
      };

      if (!response.ok) {
        result.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get webhooks by event type
   */
  async getWebhooksByEvent(event: CancellationEventType): Promise<WebhookRegistration[]> {
    const webhooks = await this.webhookRepository.findByEvent(event);
    return webhooks.map(webhook => this.mapToWebhookRegistration(webhook));
  }

  /**
   * Update webhook status
   */
  async updateWebhookStatus(id: string, isActive: boolean): Promise<WebhookRegistration> {
    const webhook = await this.webhookRepository.updateStatus(id, isActive);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return this.mapToWebhookRegistration(webhook);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats() {
    return await this.webhookRepository.getStats();
  }

  /**
   * Map webhook document to registration interface
   */
  private mapToWebhookRegistration(webhook: WebhookDocument): WebhookRegistration {
    const registration: WebhookRegistration = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events as CancellationEventType[],
      isActive: webhook.isActive,
      retryConfig: webhook.retryConfig,
      createdBy: webhook.createdBy,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt
    };

    // Only add optional properties if they exist
    if (webhook.headers && webhook.headers instanceof Map && webhook.headers.size > 0) {
      registration.headers = Object.fromEntries(webhook.headers.entries());
    }

    if (webhook.secret) {
      registration.secret = webhook.secret;
    }

    return registration;
  }
} 