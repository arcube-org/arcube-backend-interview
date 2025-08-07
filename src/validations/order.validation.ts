import { z } from 'zod';

// Query parameters for getting orders
export const GetOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'refunded', 'expired']).optional(),
  provider: z.string().trim().optional(),
  type: z.enum(['airport_transfer', 'lounge_access', 'esim', 'meal', 'insurance', 'transport']).optional(),
});

// Request body for getting orders by IDs
export const GetOrdersByIdsRequestSchema = z.object({
  orderIds: z.array(z.string().trim()).min(1).max(50),
});

// Response types
export const OrderResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    orders: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }).optional(),
  }),
  message: z.string().optional(),
});

export const OrderWithProductsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    orders: z.array(z.object({
      order: z.any(),
      products: z.array(z.any()),
    })),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }).optional(),
  }),
  message: z.string().optional(),
});

export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;
export type GetOrdersByIdsRequest = z.infer<typeof GetOrdersByIdsRequestSchema>; 