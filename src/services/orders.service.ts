import { CancelOrderResponse } from '../types';
import { CancellationService } from './cancellation/cancellation.service';

const cancellationService = new CancellationService();

export const cancel = async (orderId: string, reason?: string): Promise<CancelOrderResponse> => {
  try {
    // For now, we'll use a default user ID. In a real application, this would come from authentication
    const requestedBy = 'system';
    
    const results = await cancellationService.cancelOrder(
      orderId,
      reason || 'No reason provided',
      requestedBy,
      'customer'
    );

    // Check if any cancellations were successful
    const hasSuccessfulCancellations = results.some(result => result.success);
    
    if (!hasSuccessfulCancellations) {
      throw new Error('All cancellation attempts failed');
    }

    return {
      orderId,
      cancelledAt: new Date().toISOString(),
      reason: reason || 'No reason provided',
      status: 'cancelled'
    };
  } catch (error) {
    console.error('Order cancellation failed:', error);
    throw error;
  }
};

/**
 * Cancel a specific product in an order
 */
export const cancelProduct = async (
  orderId: string,
  productId: string,
  reason?: string
): Promise<any> => {
  try {
    // For now, we'll use a default user ID. In a real application, this would come from authentication
    const requestedBy = 'system';
    
    const result = await cancellationService.cancelProduct(
      orderId,
      productId,
      reason || 'No reason provided',
      requestedBy,
      'customer'
    );

    return result;
  } catch (error) {
    console.error('Product cancellation failed:', error);
    throw error;
  }
};

/**
 * Get cancellation audit trail
 */
export const getCancellationAuditTrail = () => {
  return cancellationService.getAuditTrail();
};

/**
 * Get cancellation audit trail by correlation ID
 */
export const getCancellationAuditTrailByCorrelationId = (correlationId: string) => {
  return cancellationService.getAuditTrailByCorrelationId(correlationId);
};