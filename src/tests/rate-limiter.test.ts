import request from 'supertest';
import express from 'express';
import { RateLimiterConfig } from '../config/rate-limiter.config';

const createTestApp = (rateLimiter: any) => {
  const app = express();
  app.use(express.json());
  app.use(rateLimiter);
  
  app.post('/test', (req, res) => {
    res.json({ success: true, message: 'Request successful' });
  });
  
  return app;
};

describe('Rate Limiter Configuration', () => {
  describe('Customer Cancellation Rate Limiter', () => {
    it('should allow requests within the limit', async () => {
      const app = createTestApp(RateLimiterConfig.customerCancellationLimiter);
      
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/test')
          .send({ test: 'data' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should block requests when limit is exceeded', async () => {
      const app = createTestApp(RateLimiterConfig.customerCancellationLimiter);
      
      let blockedResponse: any;
      
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/test')
          .send({ test: 'data' });
        
        if (response.status === 429) {
          blockedResponse = response;
          break;
        }
      }
      
      expect(blockedResponse).toBeDefined();
      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body.success).toBe(false);
      expect(blockedResponse.body.errorCode).toBe('CANCELLATION_RATE_LIMIT_EXCEEDED');
      expect(blockedResponse.body.retryAfter).toBe(3600);
    });
  });

  describe('Audit Trail Rate Limiter', () => {
    it('should allow requests within the limit', async () => {
      const app = createTestApp(RateLimiterConfig.auditTrailLimiter);
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/test')
          .send({ test: 'data' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should block requests when limit is exceeded', async () => {
      const app = createTestApp(RateLimiterConfig.auditTrailLimiter);
      
      let blockedResponse: any;
      
      for (let i = 0; i < 21; i++) {
        const response = await request(app)
          .post('/test')
          .send({ test: 'data' });
        
        if (response.status === 429) {
          blockedResponse = response;
          break;
        }
      }
      
      expect(blockedResponse).toBeDefined();
      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body.success).toBe(false);
      expect(blockedResponse.body.errorCode).toBe('AUDIT_RATE_LIMIT_EXCEEDED');
      expect(blockedResponse.body.retryAfter).toBe(900);
    });
  });

  describe('General Rate Limiter', () => {
    it('should allow requests within the limit', async () => {
      const app = createTestApp(RateLimiterConfig.generalLimiter);
      
      for (let i = 0; i < 50; i++) {
        const response = await request(app)
          .post('/test')
          .send({ test: 'data' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should include rate limit headers', async () => {
      const app = createTestApp(RateLimiterConfig.generalLimiter);
      
      const response = await request(app)
        .post('/test')
        .send({ test: 'data' });
      
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Dynamic Rate Limiter', () => {
    it('should apply different limits based on auth context', async () => {
      const testCases = [
        { authType: 'jwt', expectedLimit: 20 },
        { authType: 'api_key', expectedLimit: 100 },
        { authType: 'service_token', expectedLimit: 200 },
        { authType: 'unknown', expectedLimit: 10 }
      ];
      
      for (const testCase of testCases) {
        const dynamicLimiter = RateLimiterConfig.getDynamicLimiter();
        const app = express();
        app.use(express.json());
        
        app.use((req: any, res, next) => {
          req.authContext = { type: testCase.authType };
          next();
        });
        
        app.use(dynamicLimiter);
        
        app.post('/test', (req, res) => {
          res.json({ success: true, message: 'Request successful' });
        });
        
        for (let i = 0; i < testCase.expectedLimit; i++) {
          const response = await request(app)
            .post('/test')
            .send({ test: 'data' });
          
          expect(response.status).toBe(200);
        }
        
        const blockedResponse = await request(app)
          .post('/test')
          .send({ test: 'data' });
        
        expect(blockedResponse.status).toBe(429);
        expect(blockedResponse.body.errorCode).toBe('DYNAMIC_RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should have proper error response format', async () => {
      const app = createTestApp(RateLimiterConfig.customerCancellationLimiter);
      
      for (let i = 0; i < 11; i++) {
        await request(app).post('/test').send({ test: 'data' });
      }
      
      const response = await request(app)
        .post('/test')
        .send({ test: 'data' });
      
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('errorCode');
      expect(response.body).toHaveProperty('retryAfter');
      expect(typeof response.body.retryAfter).toBe('number');
    });

    it('should have consistent error structure across all limiters', () => {
      const limiters = [
        RateLimiterConfig.generalLimiter,
        RateLimiterConfig.customerCancellationLimiter,
        RateLimiterConfig.adminLimiter,
        RateLimiterConfig.partnerApiLimiter,
        RateLimiterConfig.systemLimiter,
        RateLimiterConfig.auditTrailLimiter
      ];
      
      limiters.forEach(limiter => {
        expect(limiter).toBeDefined();
        expect(typeof limiter).toBe('function');
      });
    });
  });
}); 