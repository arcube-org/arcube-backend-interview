// Cancellation-specific types and interfaces

export interface CancellationContext {
  orderId: string;
  productId: string;
  reason: string;
  requestedBy: string;
  requestSource: 'customer' | 'admin' | 'system';
  correlationId: string;
}

export interface CancellationResult {
  success: boolean;
  cancellationId?: string;
  refundAmount: number;
  cancellationFee: number;
  currency: string;
  status: 'completed' | 'failed' | 'partial';
  message: string;
  externalResponse?: any;
  errorCode?: string;
  retryAfter?: number;
}

export interface AuditInfo {
  commandType: string;
  provider: string;
  executionTime: number;
  timestamp: Date;
  correlationId: string;
  success: boolean;
  errorMessage?: string;
}

// DragonPass API specific types
export interface DragonPassCancellationRequest {
  booking_id: string;
  lounge_id?: string;
  booking_time?: string;
  product_id?: string;
}

export interface DragonPassCancellationResponse {
  status: 'success' | 'error';
  cancellation_id?: string;
  booking_id?: string;
  lounge_id?: string;
  refund_amount?: number;
  cancellation_fee?: number;
  currency?: string;
  refund_policy?: string;
  estimated_refund_time?: string;
  message?: string;
  error_code?: string;
  retry_after?: number;
}

// Provider types
export type ProviderType = 'dragonpass' | 'mozio' | 'airalo';

// Cancellation policy calculation result
export interface CancellationPolicyResult {
  canCancel: boolean;
  refundAmount: number;
  cancellationFee: number;
  currency: string;
  applicableWindow?: {
    hoursBeforeService: number;
    refundPercentage: number;
    description: string;
  };
  message: string;
}

// Command execution options
export interface CommandExecutionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
} 