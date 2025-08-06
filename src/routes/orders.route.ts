import { Router } from 'express';
import { 
  cancelOrder, 
  getCancellationAuditTrail, 
  getCancellationAuditTrailByCorrelationId 
} from '../controllers/orders.controller';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { RateLimiterMiddleware } from '../middleware/rate-limiter/rate-limiter.middleware';
import { PERMISSIONS } from '../types/auth.types';

const router = Router();

// Single order cancellation endpoint with auth, rate limiting, and Zod validation in controller
router.post('/cancel', 
  RateLimiterMiddleware.customerCancellation, // Strict rate limiting for cancellations
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.CANCEL_OWN_ORDERS),
  cancelOrder
);

// Audit trail endpoints (admin only) with audit-specific rate limiting
router.get('/cancellations/audit-trail', 
  RateLimiterMiddleware.auditTrail, // More restrictive for audit endpoints
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_AUDIT_TRAIL),
  getCancellationAuditTrail
);

router.get('/cancellations/audit-trail/:correlationId', 
  RateLimiterMiddleware.auditTrail, // More restrictive for audit endpoints
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_AUDIT_TRAIL),
  getCancellationAuditTrailByCorrelationId
);

export default router;