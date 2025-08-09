import { CancelOrderRequestSchema } from '../validations/cancel-order.validation';

describe('Zod Validation', () => {
  describe('CancelOrderRequestSchema', () => {
    it('should validate a valid customer app request', () => {
      const validPayload = {
        orderIdentifier: {
          pnr: 'ABC123',
          email: 'customer@example.com'
        },
        productId: 'PROD-001',
        requestSource: 'customer_app',
        reason: 'flight_cancelled',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'customer'
        }
      };

      const result = CancelOrderRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should validate a valid admin panel request', () => {
      const validPayload = {
        orderIdentifier: {
          pnr: 'ABC123'
        },
        requestSource: 'admin_panel',
        reason: 'fraud_detected',
        requestedBy: {
          userId: 'admin-456',
          userRole: 'admin'
        }
      };

      const result = CancelOrderRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject customer app request without email', () => {
      const invalidPayload = {
        orderIdentifier: {
          pnr: 'ABC123'
          // Missing email
        },
        requestSource: 'customer_app',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'customer'
        }
      };

      const result = CancelOrderRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.some(segment => segment === 'orderIdentifier') && 
          issue.path.some(segment => segment === 'email') && 
          issue.message === 'Email is required for customer_app requests'
        )).toBe(true);
      }
    });

    it('should reject mismatched user role and request source', () => {
      const invalidPayload = {
        orderIdentifier: {
          pnr: 'ABC123',
          email: 'customer@example.com'
        },
        requestSource: 'customer_app',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'admin' // Wrong role for customer_app
        }
      };

      const result = CancelOrderRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.some(segment => segment === 'requestedBy') && 
          issue.path.some(segment => segment === 'userRole') && 
          issue.message === 'User role does not match request source'
        )).toBe(true);
      }
    });

    it('should reject invalid request source', () => {
      const invalidPayload = {
        orderIdentifier: {
          pnr: 'ABC123'
        },
        requestSource: 'invalid_source', // Invalid source
        requestedBy: {
          userId: 'user-123',
          userRole: 'customer'
        }
      };

      const result = CancelOrderRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.some(segment => segment === 'requestSource') && 
          issue.message === 'Invalid request source'
        )).toBe(true);
      }
    });

    it('should reject invalid user role', () => {
      const invalidPayload = {
        orderIdentifier: {
          pnr: 'ABC123'
        },
        requestSource: 'admin_panel',
        requestedBy: {
          userId: 'user-123',
          userRole: 'invalid_role' // Invalid role
        }
      };

      const result = CancelOrderRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.some(segment => segment === 'requestedBy') && 
          issue.path.some(segment => segment === 'userRole') && 
          issue.message === 'Invalid user role'
        )).toBe(true);
      }
    });

    it('should reject missing required fields', () => {
      const invalidPayload = {
        orderIdentifier: {
          // Missing pnr
        },
        requestSource: 'admin_panel',
        requestedBy: {
          // Missing userId and userRole
        }
      };

      const result = CancelOrderRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map(issue => issue.path.join('.'));
        expect(errorPaths).toContain('orderIdentifier.pnr');
        expect(errorPaths).toContain('requestedBy.userId');
        expect(errorPaths).toContain('requestedBy.userRole');
      }
    });

    it('should reject invalid email format', () => {
      const invalidPayload = {
        orderIdentifier: {
          pnr: 'ABC123',
          email: 'invalid-email' // Invalid email format
        },
        requestSource: 'customer_app',
        requestedBy: {
          userId: 'customer-123',
          userRole: 'customer'
        }
      };

      const result = CancelOrderRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.some(segment => segment === 'orderIdentifier') && 
          issue.path.some(segment => segment === 'email') && 
          issue.message === 'Invalid email format'
        )).toBe(true);
      }
    });
  });
}); 