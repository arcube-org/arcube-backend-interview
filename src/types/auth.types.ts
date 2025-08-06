// Authentication-specific types

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'partner' | 'user' | 'system';
  permissions: string[];
}

export interface ApiKeyPayload {
  partnerId: string;
  partnerName: string;
  permissions: string[];
  apiKey: string;
}

export interface ServiceTokenPayload {
  serviceId: string;
  serviceName: string;
  permissions: string[];
  scope: string[];
}

export interface AuthResult {
  success: boolean;
  authContext?: AuthContext;
  token?: string;
  error?: string;
  errorCode?: string;
}

export interface AuthContext {
  type: 'jwt' | 'api_key' | 'service_token';
  userId?: string;
  userRole?: string;
  partnerId?: string;
  permissions: string[];
  requestSource: 'customer_app' | 'admin_panel' | 'partner_api' | 'system';
  metadata?: {
    email?: string;
    partnerName?: string;
    serviceName?: string;
    scope?: string[];
  };
}

// Request source mapping
export const REQUEST_SOURCE_MAP = {
  jwt: 'customer_app',
  api_key: 'partner_api',
  service_token: 'admin_panel' // or 'system' based on scope
} as const;

// Permission constants
export const PERMISSIONS = {
  CANCEL_OWN_ORDERS: 'cancel_own_orders',
  CANCEL_ANY_ORDER: 'cancel_any_order',
  CANCEL_PARTNER_ORDERS: 'cancel_partner_orders',
  CANCEL_SYSTEM_ORDERS: 'cancel_system_orders',
  VIEW_AUDIT_TRAIL: 'view_audit_trail',
  ADMIN_ACCESS: 'admin_access',
  MANAGE_WEBHOOKS: 'manage_webhooks',
  VIEW_WEBHOOKS: 'view_webhooks'
} as const;

// Role-based permissions
export const ROLE_PERMISSIONS = {
  customer: [PERMISSIONS.CANCEL_OWN_ORDERS],
  admin: [
    PERMISSIONS.CANCEL_ANY_ORDER, 
    PERMISSIONS.VIEW_AUDIT_TRAIL, 
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.MANAGE_WEBHOOKS,
    PERMISSIONS.VIEW_WEBHOOKS
  ],
  customer_service: [
    PERMISSIONS.CANCEL_ANY_ORDER, 
    PERMISSIONS.VIEW_AUDIT_TRAIL,
    PERMISSIONS.VIEW_WEBHOOKS
  ],
  partner: [PERMISSIONS.CANCEL_PARTNER_ORDERS],
  system: [
    PERMISSIONS.CANCEL_SYSTEM_ORDERS, 
    PERMISSIONS.VIEW_AUDIT_TRAIL,
    PERMISSIONS.MANAGE_WEBHOOKS,
    PERMISSIONS.VIEW_WEBHOOKS
  ]
} as const; 