import { Router } from 'express';
import { login, getProfile } from '../controllers/auth.controller';
import { MultiTierAuthMiddleware } from '../middleware/auth/multi-tier-auth.middleware';
import { RateLimiterMiddleware } from '../middleware/rate-limiter/rate-limiter.middleware';

const router = Router();

// Login endpoint with rate limiting
router.post('/login',
  RateLimiterMiddleware.customerCancellation, // Use same rate limiting as cancellations
  login
);

// Profile endpoint with authentication
router.get('/profile',
  MultiTierAuthMiddleware.authenticate,
  getProfile
);

export default router; 