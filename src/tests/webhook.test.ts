import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { EventBusService } from '../services/event-bus.service';
import { WebhookDispatcherService } from '../services/webhook-dispatcher.service';
import { WebhookRegistryService } from '../services/webhook-registry.service';
import { CancellationEventType } from '../types/webhook.types';
import { db } from '../config/database';
import { WebhookModel } from '../models/webhook.model';

global.fetch = jest.fn();

describe('Webhook System', () => {
  let eventBus: EventBusService;
  let webhookDispatcher: WebhookDispatcherService;
  let webhookRegistry: WebhookRegistryService;

  beforeAll(async () => {
    await db.connect();
    console.log('✅ Connected to test database');

    eventBus = EventBusService.getInstance();
    webhookDispatcher = new WebhookDispatcherService();
    webhookRegistry = new WebhookRegistryService();
  });

  afterAll(async () => {
    await db.disconnect();
    console.log('✅ Disconnected from test database');
  });

  beforeEach(async () => {
    const testWebhookNames = [
      'Test Webhook',
      'Duplicate Webhook',
      'Failed Events Webhook',
      'All Events Webhook',
      'API Test Webhook',
      'API List Test',
      'Cancellation Integration Test'
    ];
    await WebhookModel.deleteMany({ name: { $in: testWebhookNames } });

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

      eventBus.subscribe(CancellationEventType.CANCELLATION_STARTED, mockHandler);

      await eventBus.publish(testEvent);

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

      eventBus.subscribe(CancellationEventType.CANCELLATION_FAILED, handler1);
      eventBus.subscribe(CancellationEventType.CANCELLATION_FAILED, handler2);

      await eventBus.publish(testEvent);

      expect(handler1).toHaveBeenCalledWith(testEvent);
      expect(handler2).toHaveBeenCalledWith(testEvent);
    });

    it('should unsubscribe handlers', () => {
      const handler = jest.fn();
      
      eventBus.subscribe(CancellationEventType.CANCELLATION_COMPLETED, handler);
      eventBus.unsubscribe(CancellationEventType.CANCELLATION_COMPLETED, handler);

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

      const failedWebhooks = await webhookRegistry.getWebhooksByEvent(CancellationEventType.CANCELLATION_FAILED);
      expect(failedWebhooks).toHaveLength(2);

      const completedWebhooks = await webhookRegistry.getWebhooksByEvent(CancellationEventType.CANCELLATION_COMPLETED);
      expect(completedWebhooks).toHaveLength(1);
    });
  });

  describe('Webhook API Endpoints', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@arcube.com',
          password: 'Admin@123456'
        });

      authToken = loginResponse.body.data.token;
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
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(webhookData.name);
      expect(response.body.data.url).toBe(webhookData.url);
    });

    it('should retrieve webhooks via API', async () => {
      await webhookRegistry.registerWebhook({
        name: 'API List Test',
        url: 'https://example.com/list-test',
        events: [CancellationEventType.CANCELLATION_FAILED]
      }, 'admin-123');

      const response = await request(app)
        .get('/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should test webhook via API', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const webhook = await webhookRegistry.registerWebhook({
        name: 'API Test Webhook',
        url: 'https://example.com/test-webhook',
        events: [CancellationEventType.CANCELLATION_STARTED]
      }, 'admin-123');

      const response = await request(app)
        .post(`/webhooks/${webhook.id}/test`)
        .set('Authorization', `Bearer ${authToken}`)
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
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      await webhookRegistry.registerWebhook({
        name: 'Cancellation Integration Test',
        url: 'https://example.com/cancellation-webhook',
        events: [CancellationEventType.CANCELLATION_STARTED, CancellationEventType.CANCELLATION_FAILED]
      }, 'admin-123');

      eventBus.subscribe(CancellationEventType.CANCELLATION_STARTED, async (event) => {
        await webhookDispatcher.dispatchEvent(event);
      });

      eventBus.subscribe(CancellationEventType.CANCELLATION_FAILED, async (event) => {
        await webhookDispatcher.dispatchEvent(event);
      });

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

      await new Promise(resolve => setTimeout(resolve, 100));

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