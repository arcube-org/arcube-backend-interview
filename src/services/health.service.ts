import { db } from '../config/database';
import { healthConfig, HealthStatus, ReadinessStatus, HealthCheckResult, ReadinessCheckResult, HealthCheck, healthMetadata } from '../config/health.config';
import { env } from '../config/environment';
import os from 'os';
import mongoose from 'mongoose';

export class HealthService {
  private static instance: HealthService;
  private lastHealthCheck: HealthCheckResult | null = null;
  private lastReadinessCheck: ReadinessCheckResult | null = null;
  private isShuttingDown = false;

  private constructor() {}

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  /**
   * Perform comprehensive health check
   * Health = Is the application functioning correctly right now?
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Perform all health checks in parallel
      const [databaseCheck, externalServicesCheck, systemCheck, applicationCheck] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkExternalServicesHealth(),
        this.checkSystemHealth(),
        this.checkApplicationHealth()
      ]);

      const checks = {
        database: this.getHealthCheckResult(databaseCheck),
        externalServices: this.getHealthCheckResult(externalServicesCheck),
        system: this.getHealthCheckResult(systemCheck),
        application: this.getHealthCheckResult(applicationCheck)
      };

      // Determine overall health status
      const overallStatus = this.determineOverallHealthStatus(checks);
      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp,
        uptime: process.uptime(),
        version: healthMetadata.version,
        environment: env.NODE_ENV,
        checks,
        details: healthConfig.response.includeDetails ? {
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid
        } : undefined
      };

      this.lastHealthCheck = result;
      return result;

    } catch (error) {
      const result: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        timestamp,
        uptime: process.uptime(),
        version: healthMetadata.version,
        environment: env.NODE_ENV,
        checks: {
          database: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: timestamp },
          externalServices: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: timestamp },
          system: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: timestamp },
          application: { status: HealthStatus.UNHEALTHY, error: 'Health check failed', lastChecked: timestamp }
        },
        details: healthConfig.response.includeDetails ? { error: error instanceof Error ? error.message : 'Unknown error' } : undefined
      };

      this.lastHealthCheck = result;
      return result;
    }
  }

  /**
   * Perform readiness check
   * Ready = Is the application ready to serve requests?
   */
  public async performReadinessCheck(): Promise<ReadinessCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const startupTime = Date.now() - healthMetadata.startTime.getTime();

    try {
      // Perform readiness checks in parallel
      const [databaseCheck, configurationCheck, dependenciesCheck] = await Promise.allSettled([
        this.checkDatabaseReadiness(),
        this.checkConfigurationReadiness(),
        this.checkDependenciesReadiness()
      ]);

      const checks = {
        database: this.getHealthCheckResult(databaseCheck),
        configuration: this.getHealthCheckResult(configurationCheck),
        dependencies: this.getHealthCheckResult(dependenciesCheck)
      };

      // Determine overall readiness status
      const overallStatus = this.determineOverallReadinessStatus(checks, startupTime);
      const responseTime = Date.now() - startTime;

      const result: ReadinessCheckResult = {
        status: overallStatus,
        timestamp,
        startupTime,
        checks,
        details: healthConfig.response.includeDetails ? {
          responseTime,
          startupTime,
          isShuttingDown: this.isShuttingDown
        } : undefined
      };

      this.lastReadinessCheck = result;
      return result;

    } catch (error) {
      const result: ReadinessCheckResult = {
        status: ReadinessStatus.NOT_READY,
        timestamp,
        startupTime,
        checks: {
          database: { status: HealthStatus.UNHEALTHY, error: 'Readiness check failed', lastChecked: timestamp },
          configuration: { status: HealthStatus.UNHEALTHY, error: 'Readiness check failed', lastChecked: timestamp },
          dependencies: { status: HealthStatus.UNHEALTHY, error: 'Readiness check failed', lastChecked: timestamp }
        },
        details: healthConfig.response.includeDetails ? { error: error instanceof Error ? error.message : 'Unknown error' } : undefined
      };

      this.lastReadinessCheck = result;
      return result;
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Check if database is connected and responsive
      if (!db.isDatabaseConnected()) {
        return {
          status: HealthStatus.UNHEALTHY,
          error: 'Database not connected',
          lastChecked: timestamp
        };
      }

      // Perform a simple query to test responsiveness
      const connection = mongoose.connection;
      if (!connection.db) {
        return {
          status: HealthStatus.UNHEALTHY,
          error: 'Database connection not ready',
          lastChecked: timestamp
        };
      }
      
      await connection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: HealthStatus.HEALTHY,
        responseTime,
        lastChecked: timestamp,
        details: {
          connectionStatus: db.getConnectionStatus(),
          responseTime
        }
      };

    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        error: error instanceof Error ? error.message : 'Database health check failed',
        lastChecked: timestamp
      };
    }
  }

  /**
   * Check database readiness
   */
  private async checkDatabaseReadiness(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();

    try {
      // For readiness, we need to ensure database is fully connected and ready
      if (!db.isDatabaseConnected()) {
        return {
          status: HealthStatus.UNHEALTHY,
          error: 'Database not connected',
          lastChecked: timestamp
        };
      }

      // Check if we can perform basic operations
      const connection = mongoose.connection;
      if (!connection.db) {
        return {
          status: HealthStatus.UNHEALTHY,
          error: 'Database connection not ready',
          lastChecked: timestamp
        };
      }
      
      const collections = await connection.db.listCollections().toArray();
      
      return {
        status: HealthStatus.HEALTHY,
        lastChecked: timestamp,
        details: {
          collections: collections.length,
          connectionStatus: db.getConnectionStatus()
        }
      };

    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        error: error instanceof Error ? error.message : 'Database readiness check failed',
        lastChecked: timestamp
      };
    }
  }

  /**
   * Check external services health
   */
  private async checkExternalServicesHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Check DragonPass service health
      const dragonpassUrl = healthConfig.externalServices.dragonpass.url;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), healthConfig.externalServices.dragonpass.timeout);

      // Use node-fetch or global fetch if available
      const fetchFunction = globalThis.fetch || require('node-fetch');
      
      if (!fetchFunction) {
        return {
          status: HealthStatus.DEGRADED,
          error: 'Fetch function not available',
          lastChecked: timestamp,
          details: {
            dragonpass: { status: 'unavailable', error: 'Fetch function not available' }
          }
        };
      }
      
      const response = await fetchFunction(`${dragonpassUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.MOCK_SERVICE_API_KEY
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: HealthStatus.HEALTHY,
          responseTime,
          lastChecked: timestamp,
          details: {
            dragonpass: { status: 'healthy', responseTime }
          }
        };
      } else {
        return {
          status: HealthStatus.DEGRADED,
          responseTime,
          error: `DragonPass service returned ${response.status}`,
          lastChecked: timestamp,
          details: {
            dragonpass: { status: 'degraded', statusCode: response.status }
          }
        };
      }

    } catch (error) {
      return {
        status: HealthStatus.DEGRADED,
        error: error instanceof Error ? error.message : 'External services health check failed',
        lastChecked: timestamp,
        details: {
          dragonpass: { status: 'unavailable', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      };
    }
  }

  /**
   * Check system health
   */
  private checkSystemHealth(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();

    return new Promise((resolve) => {
      try {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = usedMem / totalMem;

        const loadAvg = os.loadavg();
        const cpuCount = os.cpus().length;
        const cpuUsagePercent = (loadAvg[0] || 0) / cpuCount; // 1-minute load average

        let status = HealthStatus.HEALTHY;
        const details: any = {
          memory: {
            used: Math.round(usedMem / 1024 / 1024),
            total: Math.round(totalMem / 1024 / 1024),
            usagePercent: Math.round(memoryUsagePercent * 100)
          },
          cpu: {
            loadAverage: loadAvg,
            cores: cpuCount,
            usagePercent: Math.round(cpuUsagePercent * 100)
          }
        };

        // Check thresholds
        if (memoryUsagePercent > healthConfig.system.memoryThreshold) {
          status = HealthStatus.DEGRADED;
          details.memory.warning = 'High memory usage';
        }

        if (cpuUsagePercent > healthConfig.system.cpuThreshold) {
          status = HealthStatus.DEGRADED;
          details.cpu.warning = 'High CPU usage';
        }

        resolve({
          status,
          lastChecked: timestamp,
          details
        });

      } catch (error) {
        resolve({
          status: HealthStatus.UNHEALTHY,
          error: error instanceof Error ? error.message : 'System health check failed',
          lastChecked: timestamp
        });
      }
    });
  }

  /**
   * Check application health
   */
  private checkApplicationHealth(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();

    return new Promise((resolve) => {
      try {
        const uptime = process.uptime();
        const isShuttingDown = this.isShuttingDown;

        let status = HealthStatus.HEALTHY;
        const details: any = {
          uptime: Math.round(uptime),
          pid: process.pid,
          version: healthMetadata.version,
          platform: process.platform,
          nodeVersion: process.version
        };

        if (isShuttingDown) {
          status = HealthStatus.UNHEALTHY;
          details.warning = 'Application is shutting down';
        }

        resolve({
          status,
          lastChecked: timestamp,
          details
        });

      } catch (error) {
        resolve({
          status: HealthStatus.UNHEALTHY,
          error: error instanceof Error ? error.message : 'Application health check failed',
          lastChecked: timestamp
        });
      }
    });
  }

  /**
   * Check configuration readiness
   */
  private checkConfigurationReadiness(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();

    return new Promise((resolve) => {
      try {
        // Check if all required environment variables are set
        const requiredEnvVars = [
          'MONGODB_URI',
          'MONGODB_DB_NAME',
          'JWT_SECRET',
          'API_KEY_SECRET',
          'MOCK_DRAGONPASS_SERVICE_URL',
          'MOCK_SERVICE_API_KEY'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
          resolve({
            status: HealthStatus.UNHEALTHY,
            error: `Missing required environment variables: ${missingVars.join(', ')}`,
            lastChecked: timestamp
          });
          return;
        }

        resolve({
          status: HealthStatus.HEALTHY,
          lastChecked: timestamp,
          details: {
            environment: env.NODE_ENV,
            requiredEnvVars: requiredEnvVars.length
          }
        });

      } catch (error) {
        resolve({
          status: HealthStatus.UNHEALTHY,
          error: error instanceof Error ? error.message : 'Configuration readiness check failed',
          lastChecked: timestamp
        });
      }
    });
  }

  /**
   * Check dependencies readiness
   */
  private checkDependenciesReadiness(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();

    return new Promise((resolve) => {
      try {
        // Check if all required modules are available
        const requiredModules = [
          'express',
          'mongoose',
          'helmet',
          'cors',
          'zod',
          'uuid'
        ];

        const missingModules = requiredModules.filter(moduleName => {
          try {
            require.resolve(moduleName);
            return false;
          } catch {
            return true;
          }
        });

        if (missingModules.length > 0) {
          resolve({
            status: HealthStatus.UNHEALTHY,
            error: `Missing required modules: ${missingModules.join(', ')}`,
            lastChecked: timestamp
          });
          return;
        }

        resolve({
          status: HealthStatus.HEALTHY,
          lastChecked: timestamp,
          details: {
            requiredModules: requiredModules.length
          }
        });

      } catch (error) {
        resolve({
          status: HealthStatus.UNHEALTHY,
          error: error instanceof Error ? error.message : 'Dependencies readiness check failed',
          lastChecked: timestamp
        });
      }
    });
  }

  /**
   * Helper method to extract result from Promise.allSettled
   */
  private getHealthCheckResult(promiseResult: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (promiseResult.status === 'fulfilled') {
      return promiseResult.value;
    } else {
      return {
        status: HealthStatus.UNHEALTHY,
        error: promiseResult.reason instanceof Error ? promiseResult.reason.message : 'Check failed',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealthStatus(checks: any): HealthStatus {
    const checkStatuses = Object.values(checks).map((check: any) => check.status);
    
    if (checkStatuses.every(status => status === HealthStatus.HEALTHY)) {
      return HealthStatus.HEALTHY;
    } else if (checkStatuses.some(status => status === HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    } else {
      return HealthStatus.DEGRADED;
    }
  }

  /**
   * Determine overall readiness status
   */
  private determineOverallReadinessStatus(checks: any, startupTime: number): ReadinessStatus {
    // If still in startup phase, return STARTING
    if (startupTime < healthConfig.application.startupTime) {
      return ReadinessStatus.STARTING;
    }

    // If shutting down, return NOT_READY
    if (this.isShuttingDown) {
      return ReadinessStatus.NOT_READY;
    }

    // Check if all readiness checks pass
    const checkStatuses = Object.values(checks).map((check: any) => check.status);
    const allHealthy = checkStatuses.every(status => status === HealthStatus.HEALTHY);

    return allHealthy ? ReadinessStatus.READY : ReadinessStatus.NOT_READY;
  }

  /**
   * Mark application as shutting down
   */
  public markShuttingDown(): void {
    this.isShuttingDown = true;
  }

  /**
   * Get last health check result
   */
  public getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Get last readiness check result
   */
  public getLastReadinessCheck(): ReadinessCheckResult | null {
    return this.lastReadinessCheck;
  }
} 