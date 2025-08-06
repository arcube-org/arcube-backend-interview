import { Router } from 'express';
import { 
  cancelOrder, 
  cancelProduct, 
  getCancellationAuditTrail, 
  getCancellationAuditTrailByCorrelationId 
} from '../controllers/orders.controller';

const router = Router();

// Order cancellation
router.post('/cancel', cancelOrder);

// Product cancellation
router.post('/:orderId/products/:productId/cancel', cancelProduct);

// Audit trail endpoints
router.get('/cancellations/audit-trail', getCancellationAuditTrail);
router.get('/cancellations/audit-trail/:correlationId', getCancellationAuditTrailByCorrelationId);

export default router;