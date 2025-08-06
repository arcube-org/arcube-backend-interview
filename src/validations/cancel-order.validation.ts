import { z } from 'zod';

// Zod validation schemas for cancel order request
export const OrderIdentifierSchema = z.object({
  pnr: z.string().min(1, 'PNR is required'),
  email: z.string().email('Invalid email format').optional(),
});

export const RequestedBySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userRole: z.enum(['admin', 'customer_service', 'system', 'customer', 'partner'], {
    message: 'Invalid user role'
  }),
});

export const CancelOrderRequestSchema = z.object({
  orderIdentifier: OrderIdentifierSchema,
  productId: z.string().optional(),
  requestSource: z.enum(['customer_app', 'admin_panel', 'partner_api', 'system'], {
    message: 'Invalid request source'
  }),
  reason: z.string().optional(),
  requestedBy: RequestedBySchema,
}).refine((data) => {
  // Customer app requests must include email
  if (data.requestSource === 'customer_app' && !data.orderIdentifier.email) {
    return false;
  }
  return true;
}, {
  message: 'Email is required for customer_app requests',
  path: ['orderIdentifier', 'email'],
}).refine((data) => {
  // Validate user role matches request source
  if (data.requestSource === 'customer_app' && data.requestedBy.userRole !== 'customer') {
    return false;
  }
  if (data.requestSource === 'admin_panel' && !['admin', 'customer_service'].includes(data.requestedBy.userRole)) {
    return false;
  }
  if (data.requestSource === 'partner_api' && data.requestedBy.userRole !== 'partner') {
    return false;
  }
  if (data.requestSource === 'system' && data.requestedBy.userRole !== 'system') {
    return false;
  }
  return true;
}, {
  message: 'User role does not match request source',
  path: ['requestedBy', 'userRole'],
});

export type CancelOrderRequestType = z.infer<typeof CancelOrderRequestSchema>; 