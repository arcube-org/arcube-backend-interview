import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('Security Configuration', () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Helmet Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for essential security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('content-security-policy');
    });

    it('should have correct Content Security Policy', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow requests from localhost:3001', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    it('should allow requests from localhost:3002', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3002')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3002');
    });

    it('should reject requests from disallowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'CORS policy violation',
        message: 'Origin not allowed'
      });
    });

    it('should allow requests with no origin', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Health endpoint returns health status, not "OK"
      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });

    it('should include CORS headers in preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204); // OPTIONS requests return 204 No Content

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });
  });

  describe('Rate Limiting Headers', () => {
    it('should expose rate limit headers in CORS configuration', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check that CORS exposes the rate limit headers
      const exposedHeaders = response.headers['access-control-expose-headers'];
      expect(exposedHeaders).toContain('X-Rate-Limit-Remaining');
      expect(exposedHeaders).toContain('X-Rate-Limit-Reset');
      expect(exposedHeaders).toContain('X-Total-Count');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Route not found',
        path: '/nonexistent-route'
      });
    });

    it('should handle CORS errors', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'CORS policy violation',
        message: 'Origin not allowed'
      });
    });
  });
}); 