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

// Enhanced request payload types
export interface OrderIdentifier {
  pnr: string;
  email?: string; // For customer requests
}

export interface RequestedBy {
  userId: string;
  userRole: 'admin' | 'customer_service' | 'system' | 'customer' | 'partner';
}

export interface CancelOrderRequest {
  orderIdentifier: OrderIdentifier;
  productId?: string; // Optional: if not provided, cancel entire order
  requestSource: 'customer_app' | 'admin_panel' | 'partner_api' | 'system';
  reason?: string;
  requestedBy: RequestedBy;
}

// Authentication types
export interface AuthContext {
  type: 'jwt' | 'api_key' | 'service_token';
  userId?: string;
  userRole?: string;
  partnerId?: string;
  permissions: string[];
  requestSource: 'customer_app' | 'admin_panel' | 'partner_api' | 'system';
}

// Enhanced cancellation context
export interface EnhancedCancellationContext {
  orderId: string;
  productId?: string; // Optional for full order cancellation
  reason: string;
  requestedBy: string;
  requestSource: 'customer_app' | 'admin_panel' | 'partner_api' | 'system';
  correlationId: string;
  authContext: AuthContext;
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

// Order lookup result
export interface OrderLookupResult {
  order: any;
  product?: any;
  canAccess: boolean;
  accessReason?: string;
} 