import { Router } from 'express';
import {
  registerWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookDeliveries,
  getWebhookStats
} from '../controllers/webhook.controller';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { RateLimiterMiddleware } from '../middleware/rate-limiter/rate-limiter.middleware';
import { PERMISSIONS } from '../types/auth.types';

const router = Router();

// Webhook management routes with authentication and rate limiting
router.post('/',
  RateLimiterMiddleware.admin, // Rate limit webhook registrations
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.MANAGE_WEBHOOKS),
  registerWebhook
);

router.get('/',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_WEBHOOKS),
  getWebhooks
);

router.get('/:id',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_WEBHOOKS),
  getWebhook
);

router.put('/:id',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.MANAGE_WEBHOOKS),
  updateWebhook
);

router.delete('/:id',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.MANAGE_WEBHOOKS),
  deleteWebhook
);

router.post('/:id/test',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.MANAGE_WEBHOOKS),
  testWebhook
);

router.get('/:id/deliveries',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_WEBHOOKS),
  getWebhookDeliveries
);

// Statistics endpoint (admin only)
router.get('/stats/overview',
  RateLimiterMiddleware.admin,
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_AUDIT_TRAIL),
  getWebhookStats
);

export default router; 