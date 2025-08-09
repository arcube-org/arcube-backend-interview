import { z } from 'zod';

// Zod validation schemas for login request
export const LoginRequestSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

