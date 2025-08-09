// Webhook event types for cancellation notifications
export enum CancellationEventType {
  CANCELLATION_STARTED = 'cancellation.started',
  CANCELLATION_COMPLETED = 'cancellation.completed',
  CANCELLATION_FAILED = 'cancellation.failed',
  CANCELLATION_PARTIAL = 'cancellation.partial',
  CANCELLATION_UNDO = 'cancellation.undo',
  REFUND_PROCESSED = 'refund.processed',
  AUDIT_TRAIL_UPDATED = 'audit.updated'
}

// Retry configuration for webhook delivery
export interface RetryConfiguration {
  maxRetries: number;
  retryDelay: number; // in milliseconds
  backoffMultiplier: number;
}

// Webhook registration interface
export interface WebhookRegistration {
  id: string;
  name: string;
  url: string;
  events: CancellationEventType[];
  headers?: Record<string, string>;
  isActive: boolean;
  secret?: string; // For HMAC signature verification
  retryConfig: RetryConfiguration;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Event payload interface
export interface CancellationEvent {
  type: CancellationEventType;
  data: any;
  timestamp: Date;
  correlationId: string;
  orderId?: string;
  productId?: string;
}

// Webhook delivery status
export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// Webhook delivery tracking
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: CancellationEventType;
  payload: any;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API request/response types
export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: CancellationEventType[];
  headers?: Record<string, string>;
  secret?: string;
  retryConfig?: Partial<RetryConfiguration>;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: CancellationEventType[];
  headers?: Record<string, string>;
  isActive?: boolean;
  secret?: string;
  retryConfig?: Partial<RetryConfiguration>;
}

export interface TestWebhookResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
}

// Webhook delivery response
export interface WebhookDeliveryResponse {
  success: boolean;
  webhookId: string;
  eventId: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
}

// Event bus subscriber function type
export type EventSubscriber = (event: CancellationEvent) => Promise<void>;

// Webhook payload with signature
export interface WebhookPayload {
  event: CancellationEvent;
  timestamp: number;
  signature?: string; // HMAC signature
}

// CLI options for webhook management
export interface WebhookCLIOptions {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
} 