/**
 * Webhook Configuration
 * Centralized configuration for webhook system
 */
export const webhookConfig = {
  // Delivery settings
  delivery: {
    maxRetries: 3,
    retryDelay: 5000, // milliseconds
    backoffMultiplier: 2,
    timeout: 10000, // milliseconds
    batchSize: 5, // number of events to process concurrently
  },

  // Security settings
  security: {
    minSecretLength: 16,
    allowedDomains: [
      'example.com',
      'api.example.com',
      'webhooks.example.com',
      'localhost',
      '127.0.0.1'
    ],
    maxUrlLength: 2048,
    maxHeadersCount: 20,
    maxHeaderValueLength: 1024
  },

  // Rate limiting
  rateLimit: {
    webhookRegistration: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10 // limit each IP to 10 webhook registrations per windowMs
    },
    webhookTesting: {
      windowMs: 60 * 1000, // 1 minute
      max: 5 // limit each IP to 5 webhook tests per windowMs
    }
  },

  // Cleanup settings
  cleanup: {
    eventRetentionDays: 30, // days to keep webhook events
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    batchDeleteSize: 1000 // number of events to delete in one batch
  },

  // Monitoring
  monitoring: {
    enableMetrics: true,
    logFailedDeliveries: true,
    alertOnHighFailureRate: true,
    failureRateThreshold: 0.1 // 10% failure rate threshold
  },

  // Event types configuration
  events: {
    // Maximum number of events a webhook can subscribe to
    maxEventsPerWebhook: 10,
    
    // Default events for new webhooks (if none specified)
    defaultEvents: ['cancellation.failed']
  },

  // Validation
  validation: {
    requireHttps: true, // require HTTPS URLs in production
    validateUrlReachability: false, // whether to test URL reachability on registration
    maxNameLength: 100,
    maxDescriptionLength: 500
  }
};

/**
 * Environment-specific overrides
 */
export const getWebhookConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const config = { ...webhookConfig };
  
  if (env === 'development') {
    // Development overrides
    config.security.allowedDomains.push('localhost:3000', 'localhost:3001', 'localhost:3002');
    config.validation.requireHttps = false;
    config.validation.validateUrlReachability = false;
  }
  
  if (env === 'production') {
    // Production overrides
    config.delivery.maxRetries = 5;
    config.delivery.retryDelay = 3000;
    config.cleanup.eventRetentionDays = 90;
    config.validation.requireHttps = true;
  }
  
  return config;
}; 