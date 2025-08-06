import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { EventBusService } from '../services/event-bus.service';
import { WebhookDispatcherService } from '../services/webhook-dispatcher.service';
import { WebhookRegistryService } from '../services/webhook-registry.service';
import { CancellationEventType } from '../types/webhook.types';
import { db } from '../config/database';

// Mock fetch for webhook testing
global.fetch = jest.fn();

describe('Webhook System', () => {
  let eventBus: EventBusService;
  let webhookDispatcher: WebhookDispatcherService;
  let webhookRegistry: WebhookRegistryService;

  beforeAll(async () => {
    // Use existing database connection
    await db.connect();
    console.log('✅ Connected to test database');

    // Initialize services
    eventBus = EventBusService.getInstance();
    webhookDispatcher = new WebhookDispatcherService();
    webhookRegistry = new WebhookRegistryService();
  });

  afterAll(async () => {
    await db.disconnect();
    console.log('✅ Disconnected from test database');
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

    // Clear event bus subscribers
    eventBus.clearSubscribers();
  });

  describe('Event Bus Service', () => {
    it('should subscribe and publish events', async () => {
      const mockHandler = jest.fn();
      const testEvent = {
        type: CancellationEventType.CANCELLATION_STARTED,
        data: { test: true },
        timestamp: new Date(),
        correlationId: 'test-123'
      };

      // Subscribe to event
      eventBus.subscribe(CancellationEventType.CANCELLATION_STARTED, mockHandler);

      // Publish event
      await eventBus.publish(testEvent);

      // Verify handler was called
      expect(mockHandler).toHaveBeenCalledWith(testEvent);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const testEvent = {
        type: CancellationEventType.CANCELLATION_FAILED,
        data: { test: true },
        timestamp: new Date(),
        correlationId: 'test-456'
      };

      // Subscribe multiple handlers
      eventBus.subscribe(CancellationEventType.CANCELLATION_FAILED, handler1);
      eventBus.subscribe(CancellationEventType.CANCELLATION_FAILED, handler2);

      // Publish event
      await eventBus.publish(testEvent);

      // Verify both handlers were called
      expect(handler1).toHaveBeenCalledWith(testEvent);
      expect(handler2).toHaveBeenCalledWith(testEvent);
    });

    it('should unsubscribe handlers', () => {
      const handler = jest.fn();
      
      // Subscribe and then unsubscribe
      eventBus.subscribe(CancellationEventType.CANCELLATION_COMPLETED, handler);
      eventBus.unsubscribe(CancellationEventType.CANCELLATION_COMPLETED, handler);

      // Verify subscriber count is 0
      expect(eventBus.getSubscriberCount(CancellationEventType.CANCELLATION_COMPLETED)).toBe(0);
    });
  });

  describe('Webhook Registry Service', () => {
    it('should register a new webhook', async () => {
      const webhookData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: [CancellationEventType.CANCELLATION_FAILED],
        secret: 'test-secret-123456789'
      };

      const webhook = await webhookRegistry.registerWebhook(webhookData, 'admin-123');

      expect(webhook).toBeDefined();
      expect(webhook.name).toBe(webhookData.name);
      expect(webhook.url).toBe(webhookData.url);
      expect(webhook.events).toEqual(webhookData.events);
      expect(webhook.isActive).toBe(true);
      expect(webhook.createdBy).toBe('admin-123');
    });

    it('should validate webhook URL format', async () => {
      const invalidWebhookData = {
        name: 'Invalid Webhook',
        url: 'invalid-url',
        events: [CancellationEventType.CANCELLATION_FAILED]
      };

      await expect(
        webhookRegistry.registerWebhook(invalidWebhookData, 'admin-123')
      ).rejects.toThrow('Invalid webhook URL format');
    });

    it('should prevent duplicate webhook names', async () => {
      const webhookData = {
        name: 'Duplicate Webhook',
        url: 'https://example.com/webhook1',
        events: [CancellationEventType.CANCELLATION_FAILED]
      };

      // Register first webhook
      await webhookRegistry.registerWebhook(webhookData, 'admin-123');

      // Try to register second webhook with same name
      const duplicateData = {
        ...webhookData,
        url: 'https://example.com/webhook2'
      };

      await expect(
        webhookRegistry.registerWebhook(duplicateData, 'admin-123')
      ).rejects.toThrow('Webhook name already exists');
    });

    it('should retrieve webhooks by event type', async () => {
      // Register webhooks for different events
      await webhookRegistry.registerWebhook({
        name: 'Failed Events Webhook',
        url: 'https://example.com/failed',
        events: [CancellationEventType.CANCELLATION_FAILED]
      }, 'admin-123');

      await webhookRegistry.registerWebhook({
        name: 'All Events Webhook',
        url: 'https://example.com/all',
        events: [CancellationEventType.CANCELLATION_FAILED, CancellationEventType.CANCELLATION_COMPLETED]
      }, 'admin-123');

      // Get webhooks for failed events
      const failedWebhooks = await webhookRegistry.getWebhooksByEvent(CancellationEventType.CANCELLATION_FAILED);
      expect(failedWebhooks).toHaveLength(2);

      // Get webhooks for completed events
      const completedWebhooks = await webhookRegistry.getWebhooksByEvent(CancellationEventType.CANCELLATION_COMPLETED);
      expect(completedWebhooks).toHaveLength(1);
    });
  });

  describe('Webhook API Endpoints', () => {
    const mockAuthContext = {
      type: 'service_token' as const,
      userId: 'admin-123',
      userRole: 'admin',
      permissions: ['manage_webhooks', 'view_webhooks'],
      requestSource: 'admin_panel' as const
    };

    beforeEach(() => {
      // Mock authentication middleware - simplified approach
      jest.doMock('../middleware/auth/multi-tier-auth.middleware', () => ({
        MultiTierAuthMiddleware: {
          authenticate: jest.fn((req: any, res: any, next: any) => {
            req.authContext = mockAuthContext;
            next();
          }),
          hasPermission: jest.fn((permission: string) => (req: any, res: any, next: any) => {
            if (req.authContext?.permissions.includes(permission)) {
              next();
            } else {
              res.status(403).json({ success: false, error: 'Access denied' });
            }
          })
        }
      }));
    });

    it('should register webhook via API', async () => {
      const webhookData = {
        name: 'API Test Webhook',
        url: 'https://example.com/api-webhook',
        events: [CancellationEventType.CANCELLATION_FAILED],
        secret: 'api-secret-123456789'
      };

      const response = await request(app)
        .post('/webhooks')
        .send(webhookData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(webhookData.name);
      expect(response.body.data.url).toBe(webhookData.url);
    });

    it('should retrieve webhooks via API', async () => {
      // First register a webhook
      await webhookRegistry.registerWebhook({
        name: 'API List Test',
        url: 'https://example.com/list-test',
        events: [CancellationEventType.CANCELLATION_FAILED]
      }, 'admin-123');

      const response = await request(app)
        .get('/webhooks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should test webhook via API', async () => {
      // Mock fetch response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      // Register a webhook first
      const webhook = await webhookRegistry.registerWebhook({
        name: 'API Test Webhook',
        url: 'https://example.com/test-webhook',
        events: [CancellationEventType.CANCELLATION_STARTED]
      }, 'admin-123');

      const response = await request(app)
        .post(`/webhooks/${webhook.id}/test`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        webhook.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Webhook Integration with Cancellation', () => {
    it('should dispatch webhooks when cancellation events occur', async () => {
      // Mock fetch for webhook delivery
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      // Register a webhook
      await webhookRegistry.registerWebhook({
        name: 'Cancellation Integration Test',
        url: 'https://example.com/cancellation-webhook',
        events: [CancellationEventType.CANCELLATION_STARTED, CancellationEventType.CANCELLATION_FAILED]
      }, 'admin-123');

      // Subscribe webhook dispatcher to events
      eventBus.subscribe(CancellationEventType.CANCELLATION_STARTED, async (event) => {
        await webhookDispatcher.dispatchEvent(event);
      });

      eventBus.subscribe(CancellationEventType.CANCELLATION_FAILED, async (event) => {
        await webhookDispatcher.dispatchEvent(event);
      });

      // Publish a cancellation event
      const testEvent = {
        type: CancellationEventType.CANCELLATION_STARTED,
        data: {
          orderId: 'order-123',
          productId: 'product-456',
          reason: 'Customer request'
        },
        timestamp: new Date(),
        correlationId: 'test-correlation-123'
      };

      await eventBus.publish(testEvent);

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify webhook was called
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/cancellation-webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Id': expect.any(String),
            'X-Event-Type': CancellationEventType.CANCELLATION_STARTED
          }),
          body: expect.stringContaining('cancellation.started')
        })
      );
    });
  });
}); 