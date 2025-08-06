import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';
import { healthConfig, HealthStatus, ReadinessStatus } from '../config/health.config';

const healthService = HealthService.getInstance();

/**
 * Health check endpoint
 * GET /health
 * 
 * Health = Is the application functioning correctly right now?
 * This endpoint checks:
 * - Database connectivity and responsiveness
 * - External services availability
 * - System resources (memory, CPU)
 * - Application state
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthResult = await healthService.performHealthCheck();
    
    // Set appropriate HTTP status code based on health status
    let statusCode = 200;
    switch (healthResult.status) {
      case HealthStatus.HEALTHY:
        statusCode = 200;
        break;
      case HealthStatus.DEGRADED:
        statusCode = 200; // Still responding, but with warnings
        break;
      case HealthStatus.UNHEALTHY:
        statusCode = 503; // Service Unavailable
        break;
    }

    // Set cache control headers
    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('X-Health-Status', healthResult.status);
    res.set('X-Health-Timestamp', healthResult.timestamp);

    res.status(statusCode).json({
      success: healthResult.status === HealthStatus.HEALTHY,
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      uptime: healthResult.uptime,
      version: healthResult.version,
      environment: healthResult.environment,
      checks: healthResult.checks,
      ...(healthResult.details && { details: healthResult.details })
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('X-Health-Status', HealthStatus.UNHEALTHY);
    res.set('X-Health-Timestamp', new Date().toISOString());

    res.status(503).json({
      success: false,
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: 'Health check failed',
      checks: {
        database: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: new Date().toISOString() },
        externalServices: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: new Date().toISOString() },
        system: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: new Date().toISOString() },
        application: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: new Date().toISOString() }
      }
    });
  }
};

/**
 * Readiness check endpoint
 * GET /ready
 * 
 * Ready = Is the application ready to serve requests?
 * This endpoint checks:
 * - Database readiness (fully connected and operational)
 * - Configuration completeness
 * - Dependencies availability
 * - Startup completion
 */
export const getReady = async (req: Request, res: Response): Promise<void> => {
  try {
    const readinessResult = await healthService.performReadinessCheck();
    
    // Set appropriate HTTP status code based on readiness status
    let statusCode = 200;
    switch (readinessResult.status) {
      case ReadinessStatus.READY:
        statusCode = 200;
        break;
      case ReadinessStatus.STARTING:
        statusCode = 503; // Service Unavailable - still starting
        break;
      case ReadinessStatus.NOT_READY:
        statusCode = 503; // Service Unavailable
        break;
    }

    // Set cache control headers
    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('X-Ready-Status', readinessResult.status);
    res.set('X-Ready-Timestamp', readinessResult.timestamp);

    res.status(statusCode).json({
      success: readinessResult.status === ReadinessStatus.READY,
      status: readinessResult.status,
      timestamp: readinessResult.timestamp,
      startupTime: readinessResult.startupTime,
      checks: readinessResult.checks,
      ...(readinessResult.details && { details: readinessResult.details })
    });

  } catch (error) {
    console.error('Readiness check failed:', error);
    
    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('X-Ready-Status', ReadinessStatus.NOT_READY);
    res.set('X-Ready-Timestamp', new Date().toISOString());

    res.status(503).json({
      success: false,
      status: ReadinessStatus.NOT_READY,
      timestamp: new Date().toISOString(),
      startupTime: Date.now() - (new Date(process.env.START_TIME || Date.now())).getTime(),
      error: 'Readiness check failed',
      checks: {
        database: { status: HealthStatus.UNHEALTHY, error: 'Readiness check failed', lastChecked: new Date().toISOString() },
        configuration: { status: HealthStatus.UNHEALTHY, error: 'Readiness check failed', lastChecked: new Date().toISOString() },
        dependencies: { status: HealthStatus.UNHEALTHY, error: 'Readiness check failed', lastChecked: new Date().toISOString() }
      }
    });
  }
};

/**
 * Simple health check endpoint (legacy compatibility)
 * GET /health/simple
 * 
 * Returns a simple health status for basic monitoring
 */
export const getSimpleHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthResult = await healthService.performHealthCheck();
    
    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('X-Health-Status', healthResult.status);

    res.status(200).json({
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      uptime: healthResult.uptime
    });

  } catch (error) {
    console.error('Simple health check failed:', error);
    
    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('X-Health-Status', HealthStatus.UNHEALTHY);

    res.status(503).json({
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
};

/**
 * Health check with metrics
 * GET /health/metrics
 * 
 * Returns detailed health metrics for monitoring systems
 */
export const getHealthMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthResult = await healthService.performHealthCheck();
    
    // Only include metrics in development or if explicitly requested
    if (!healthConfig.response.includeMetrics) {
      res.status(403).json({
        success: false,
        error: 'Metrics endpoint not available in production'
      });
      return;
    }

    res.set('Cache-Control', healthConfig.response.cacheControl);
    res.set('Content-Type', 'application/json');

    res.status(200).json({
      success: true,
      metrics: {
        health: healthResult,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
          uptime: process.uptime()
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Health metrics failed:', error);
    
    res.status(503).json({
      success: false,
      error: 'Health metrics failed',
      timestamp: new Date().toISOString()
    });
  }
}; 