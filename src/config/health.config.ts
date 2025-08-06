import { env } from './environment';

// Health check configuration
export const healthConfig = {
  // Database health check settings
  database: {
    timeout: 5000, // 5 seconds
    maxRetries: 3,
    checkInterval: 30000, // 30 seconds
  },
  
  // External service health check settings
  externalServices: {
    dragonpass: {
      url: env.MOCK_DRAGONPASS_SERVICE_URL,
      timeout: 3000, // 3 seconds
      maxRetries: 2,
    }
  },
  
  // Memory and system health thresholds
  system: {
    memoryThreshold: 0.9, // 90% memory usage threshold
    cpuThreshold: 0.8, // 80% CPU usage threshold
    diskThreshold: 0.85, // 85% disk usage threshold
  },
  
  // Application health settings
  application: {
    startupTime: 30000, // 30 seconds to consider app fully started
    gracefulShutdown: true,
    healthCheckInterval: 60000, // 1 minute
  },
  
  // Response settings
  response: {
    includeDetails: env.NODE_ENV === 'development',
    includeMetrics: env.NODE_ENV === 'development',
    cacheControl: 'no-cache',
  }
};

// Health status types
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded'
}

export enum ReadinessStatus {
  READY = 'ready',
  NOT_READY = 'not_ready',
  STARTING = 'starting'
}

// Health check result interface
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    externalServices: HealthCheck;
    system: HealthCheck;
    application: HealthCheck;
  };
  details?: any;
}

export interface ReadinessCheckResult {
  status: ReadinessStatus;
  timestamp: string;
  startupTime: number;
  checks: {
    database: HealthCheck;
    configuration: HealthCheck;
    dependencies: HealthCheck;
  };
  details?: any;
}

export interface HealthCheck {
  status: HealthStatus;
  responseTime?: number;
  error?: string;
  lastChecked: string;
  details?: any;
}

// Health check metadata
export const healthMetadata = {
  version: process.env.npm_package_version || '1.0.0',
  name: 'Arcube Backend API',
  description: 'Order cancellation and webhook management service',
  startTime: new Date(),
}; 