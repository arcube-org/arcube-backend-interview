import { Router } from 'express';
import { 
  cancelOrder, 
  getCancellationAuditTrail, 
  getCancellationAuditTrailByCorrelationId 
} from '../controllers/orders.controller';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { PERMISSIONS } from '../types/auth.types';

const router = Router();

// Single order cancellation endpoint with auth and Zod validation in controller
router.post('/cancel', 
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.CANCEL_OWN_ORDERS),
  cancelOrder
);

// Audit trail endpoints (admin only)
router.get('/cancellations/audit-trail', 
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_AUDIT_TRAIL),
  getCancellationAuditTrail
);

router.get('/cancellations/audit-trail/:correlationId', 
  MultiTierAuthMiddleware.authenticate,
  MultiTierAuthMiddleware.hasPermission(PERMISSIONS.VIEW_AUDIT_TRAIL),
  getCancellationAuditTrailByCorrelationId
);

export default router;