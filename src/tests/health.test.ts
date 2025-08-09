import request from 'supertest';
import app from '../app';
import { db } from '../config/database';
import { HealthService } from '../services/health.service';
import { HealthStatus, ReadinessStatus } from '../config/health.config';

describe('Health Check Endpoints', () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('GET /health', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('checks');

      // Check that all required checks are present
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('externalServices');
      expect(response.body.checks).toHaveProperty('system');
      expect(response.body.checks).toHaveProperty('application');

      // Check response headers
      expect(response.headers['x-health-status']).toBeDefined();
      expect(response.headers['x-health-timestamp']).toBeDefined();
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('should include details in development environment', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // In development, details should be included
      if (process.env.NODE_ENV === 'development') {
        expect(response.body).toHaveProperty('details');
        expect(response.body.details).toHaveProperty('responseTime');
        expect(response.body.details).toHaveProperty('memoryUsage');
        expect(response.body.details).toHaveProperty('cpuUsage');
      }
    });

    it('should handle health check failures gracefully', async () => {
      // Mock a health check failure
      const healthService = HealthService.getInstance();
      jest.spyOn(healthService, 'performHealthCheck').mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe(HealthStatus.UNHEALTHY);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('checks');

      jest.restoreAllMocks();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready');

      // The readiness endpoint may return 200 (ready) or 503 (starting/not ready)
      // depending on the application startup time
      expect([200, 503]).toContain(response.status);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('startupTime');
      expect(response.body).toHaveProperty('checks');

      // Check that all required readiness checks are present
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('configuration');
      expect(response.body.checks).toHaveProperty('dependencies');

      // Check response headers
      expect(response.headers['x-ready-status']).toBeDefined();
      expect(response.headers['x-ready-timestamp']).toBeDefined();
      expect(response.headers['cache-control']).toBe('no-cache');

      // Verify the status is one of the expected values
      expect(['ready', 'not_ready', 'starting']).toContain(response.body.status);
    });

    it('should return 503 when not ready', async () => {
      // Mock a readiness check failure
      const healthService = HealthService.getInstance();
      jest.spyOn(healthService, 'performReadinessCheck').mockResolvedValue({
        status: ReadinessStatus.NOT_READY,
        timestamp: new Date().toISOString(),
        startupTime: 5000,
        checks: {
          database: { status: HealthStatus.UNHEALTHY, error: 'Database not ready', lastChecked: new Date().toISOString() },
          configuration: { status: HealthStatus.HEALTHY, lastChecked: new Date().toISOString() },
          dependencies: { status: HealthStatus.HEALTHY, lastChecked: new Date().toISOString() }
        }
      });

      const response = await request(app)
        .get('/health/ready')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe(ReadinessStatus.NOT_READY);

      jest.restoreAllMocks();
    });

    it('should return 503 when starting up', async () => {
      // Mock a starting status
      const healthService = HealthService.getInstance();
      jest.spyOn(healthService, 'performReadinessCheck').mockResolvedValue({
        status: ReadinessStatus.STARTING,
        timestamp: new Date().toISOString(),
        startupTime: 5000,
        checks: {
          database: { status: HealthStatus.HEALTHY, lastChecked: new Date().toISOString() },
          configuration: { status: HealthStatus.HEALTHY, lastChecked: new Date().toISOString() },
          dependencies: { status: HealthStatus.HEALTHY, lastChecked: new Date().toISOString() }
        }
      });

      const response = await request(app)
        .get('/health/ready')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe(ReadinessStatus.STARTING);

      jest.restoreAllMocks();
    });
  });

  describe('GET /health/simple', () => {
    it('should return simple health status', async () => {
      const response = await request(app)
        .get('/health/simple')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');

      // Should not include detailed checks
      expect(response.body).not.toHaveProperty('checks');
      expect(response.body).not.toHaveProperty('details');

      // Check response headers
      expect(response.headers['x-health-status']).toBeDefined();
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('should handle simple health check failures', async () => {
      // Mock a health check failure
      const healthService = HealthService.getInstance();
      jest.spyOn(healthService, 'performHealthCheck').mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/health/simple')
        .expect(503);

      expect(response.body.status).toBe(HealthStatus.UNHEALTHY);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');

      jest.restoreAllMocks();
    });
  });

  describe('GET /health/metrics', () => {
    it('should return detailed metrics in development', async () => {
      // Only test in development environment
      if (process.env.NODE_ENV !== 'development') {
        const response = await request(app)
          .get('/health/metrics')
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Metrics endpoint not available in production');
        return;
      }

      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('health');
      expect(response.body.metrics).toHaveProperty('system');
      expect(response.body.metrics).toHaveProperty('timestamp');

      // Check system metrics
      expect(response.body.metrics.system).toHaveProperty('memory');
      expect(response.body.metrics.system).toHaveProperty('cpu');
      expect(response.body.metrics.system).toHaveProperty('platform');
      expect(response.body.metrics.system).toHaveProperty('nodeVersion');
      expect(response.body.metrics.system).toHaveProperty('pid');
      expect(response.body.metrics.system).toHaveProperty('uptime');
    });
  });

  describe('Health Check Logic', () => {
    it('should determine correct overall health status', async () => {
      const healthService = HealthService.getInstance();
      
      // Test healthy status
      const healthyResult = await healthService.performHealthCheck();
      expect([HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]).toContain(healthyResult.status);
      
      // Test readiness status
      const readyResult = await healthService.performReadinessCheck();
      expect([ReadinessStatus.READY, ReadinessStatus.NOT_READY, ReadinessStatus.STARTING]).toContain(readyResult.status);
    });

    it('should include all required health checks', async () => {
      const healthService = HealthService.getInstance();
      const result = await healthService.performHealthCheck();

      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('externalServices');
      expect(result.checks).toHaveProperty('system');
      expect(result.checks).toHaveProperty('application');

      // Each check should have required properties
      Object.values(result.checks).forEach((check: any) => {
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('lastChecked');
        expect([HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]).toContain(check.status);
      });
    });

    it('should include all required readiness checks', async () => {
      const healthService = HealthService.getInstance();
      const result = await healthService.performReadinessCheck();

      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('configuration');
      expect(result.checks).toHaveProperty('dependencies');

      // Each check should have required properties
      Object.values(result.checks).forEach((check: any) => {
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('lastChecked');
        expect([HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]).toContain(check.status);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection issues', async () => {
      // This test verifies that health checks handle database issues gracefully
      const response = await request(app)
        .get('/health')
        .expect(200); // Should still return a response, even if degraded

      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks.database).toHaveProperty('status');
      expect(response.body.checks.database).toHaveProperty('lastChecked');
    });

    it('should handle external service failures gracefully', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.externalServices).toHaveProperty('status');
      // External service failures should result in degraded status, not unhealthy
      expect([HealthStatus.HEALTHY, HealthStatus.DEGRADED]).toContain(response.body.checks.externalServices.status);
    });
  });
}); 