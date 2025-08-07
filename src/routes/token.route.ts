import { Router } from 'express';
import { 
  generateToken, 
  getUserTokens, 
  blockToken, 
  deleteToken,
  getAllTokens 
} from '../controllers/token.controller';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { RateLimiterMiddleware } from '../middleware/rate-limiter/rate-limiter.middleware';

const router = Router();

// All token routes require authentication
router.use(MultiTierAuthMiddleware.authenticate);

// User token management routes
router.post('/generate',
  RateLimiterMiddleware.customerCancellation, // Use same rate limiting
  generateToken
);

router.get('/my-tokens',
  getUserTokens
);

router.patch('/:tokenId/block',
  blockToken
);



router.delete('/:tokenId',
  deleteToken
);

// Admin routes for system-wide token management
router.get('/all',
  MultiTierAuthMiddleware.hasPermission('admin_access'),
  getAllTokens
);

export default router; 