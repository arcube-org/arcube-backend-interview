#!/usr/bin/env node

import { Command } from 'commander';
import { WebhookRegistryService } from '../services/webhook-registry.service';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { CancellationEventType } from '../types/webhook.types';
import { db } from '../config/database';

const program = new Command();
const webhookRegistry = new WebhookRegistryService();
const webhookEventRepository = new WebhookEventRepository();

// Initialize database connection
const initializeDB = async () => {
  try {
    await db.connect();
    console.log('✅ Connected to database');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Cleanup database connection
const cleanup = async () => {
  await db.disconnect();
  console.log('✅ Disconnected from database');
};

program
  .name('webhook-cli')
  .description('CLI tool for managing webhooks')
  .version('1.0.0');

// Register webhook command
program
  .command('register')
  .description('Register a new webhook')
  .requiredOption('-n, --name <name>', 'Webhook name')
  .requiredOption('-u, --url <url>', 'Webhook URL')
  .requiredOption('-e, --events <events>', 'Comma-separated list of events')
  .option('-s, --secret <secret>', 'Webhook secret for HMAC signature')
  .option('-c, --created-by <user>', 'User creating the webhook', 'system')
  .action(async (options) => {
    try {
      await initializeDB();

      const events = options.events.split(',').map((e: string) => e.trim()) as CancellationEventType[];
      
      // Validate events
      const validEvents = Object.values(CancellationEventType);
      const invalidEvents = events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        console.error('❌ Invalid events:', invalidEvents.join(', '));
        console.log('Valid events:', validEvents.join(', '));
        process.exit(1);
      }

      const webhookData = {
        name: options.name,
        url: options.url,
        events,
        secret: options.secret
      };

      const webhook = await webhookRegistry.registerWebhook(webhookData, options.createdBy);
      
      console.log('✅ Webhook registered successfully');
      console.log('ID:', webhook.id);
      console.log('Name:', webhook.name);
      console.log('URL:', webhook.url);
      console.log('Events:', webhook.events.join(', '));
      console.log('Status:', webhook.isActive ? 'Active' : 'Inactive');

    } catch (error) {
      console.error('❌ Failed to register webhook:', error);
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

// List webhooks command
program
  .command('list')
  .description('List all webhooks')
  .option('-c, --created-by <user>', 'Filter by creator')
  .option('-e, --event <event>', 'Filter by event type')
  .action(async (options) => {
    try {
      await initializeDB();

      let webhooks;
      if (options.createdBy) {
        webhooks = await webhookRegistry.getWebhooks(options.createdBy);
      } else {
        webhooks = await webhookRegistry.getWebhooks();
      }

      if (options.event) {
        webhooks = webhooks.filter(w => w.events.includes(options.event as CancellationEventType));
      }

      if (webhooks.length === 0) {
        console.log('No webhooks found');
        return;
      }

      console.log(`Found ${webhooks.length} webhook(s):\n`);
      
      webhooks.forEach((webhook, index) => {
        console.log(`${index + 1}. ${webhook.name}`);
        console.log(`   ID: ${webhook.id}`);
        console.log(`   URL: ${webhook.url}`);
        console.log(`   Events: ${webhook.events.join(', ')}`);
        console.log(`   Status: ${webhook.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Created by: ${webhook.createdBy}`);
        console.log(`   Created: ${webhook.createdAt.toISOString()}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to list webhooks:', error);
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

// Test webhook command
program
  .command('test')
  .description('Test a webhook by sending a test event')
  .requiredOption('-i, --id <id>', 'Webhook ID')
  .action(async (options) => {
    try {
      await initializeDB();

      console.log('Testing webhook...');
      const result = await webhookRegistry.testWebhook(options.id);
      
      if (result.success) {
        console.log('✅ Webhook test successful');
        console.log(`Status Code: ${result.statusCode}`);
        console.log(`Response Time: ${result.responseTime}ms`);
      } else {
        console.log('❌ Webhook test failed');
        console.log(`Error: ${result.errorMessage}`);
        if (result.statusCode) {
          console.log(`Status Code: ${result.statusCode}`);
        }
        if (result.responseTime) {
          console.log(`Response Time: ${result.responseTime}ms`);
        }
      }

    } catch (error) {
      console.error('❌ Failed to test webhook:', error);
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

// Delete webhook command
program
  .command('delete')
  .description('Delete a webhook')
  .requiredOption('-i, --id <id>', 'Webhook ID')
  .action(async (options) => {
    try {
      await initializeDB();

      console.log('Deleting webhook...');
      await webhookRegistry.deleteWebhook(options.id);
      console.log('✅ Webhook deleted successfully');

    } catch (error) {
      console.error('❌ Failed to delete webhook:', error);
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

// Get webhook statistics command
program
  .command('stats')
  .description('Get webhook statistics')
  .action(async () => {
    try {
      await initializeDB();

      const [webhookStats, deliveryStats] = await Promise.all([
        webhookRegistry.getWebhookStats(),
        webhookEventRepository.getDeliveryStats()
      ]);

      console.log('📊 Webhook Statistics\n');
      
      console.log('Webhooks:');
      console.log(`  Total: ${webhookStats.total}`);
      console.log(`  Active: ${webhookStats.active}`);
      console.log(`  Inactive: ${webhookStats.inactive}`);
      
      if (Object.keys(webhookStats.byEvent).length > 0) {
        console.log('  By Event:');
        Object.entries(webhookStats.byEvent).forEach(([event, count]) => {
          console.log(`    ${event}: ${count}`);
        });
      }

      console.log('\nDeliveries:');
      console.log(`  Total: ${deliveryStats.total}`);
      console.log(`  Pending: ${deliveryStats.pending}`);
      console.log(`  Delivered: ${deliveryStats.delivered}`);
      console.log(`  Failed: ${deliveryStats.failed}`);
      console.log(`  Retrying: ${deliveryStats.retrying}`);
      console.log(`  Success Rate: ${deliveryStats.successRate}%`);

    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

// List available events command
program
  .command('events')
  .description('List available event types')
  .action(() => {
    console.log('Available event types:\n');
    Object.values(CancellationEventType).forEach(event => {
      console.log(`  • ${event}`);
    });
  });

// Parse command line arguments
program.parse(); 