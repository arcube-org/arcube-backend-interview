import { Product, CancellationRequest, RefundCalculation, CancellationWindow } from '../types';
import { findProductByBookingId, findProductById } from '../data/sample-products';

export class CancellationService {
  /**
   * Calculate refund based on product cancellation policy
   */
  public calculateRefund(product: Product, _bookingTime: Date): RefundCalculation {
    const currentTime = new Date();
    const hoursBeforeService = (product.serviceDateTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    // Check if product can be cancelled
    if (!product.cancellationPolicy.canCancel) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_cancellation_allowed',
        message: 'This product cannot be cancelled'
      };
    }

    // Check cancellation conditions
    if (product.cancellationPolicy.cancelCondition === 'only_if_not_activated') {
      if (product.metadata.isActivated) {
        return {
          refund_amount: 0,
          cancellation_fee: product.price.amount,
          refund_policy: 'no_refund_activated',
          message: 'Product has been activated and cannot be cancelled'
        };
      }
    }

    // Find applicable cancellation window
    const applicableWindow = this.findApplicableWindow(product.cancellationPolicy.windows, hoursBeforeService);

    if (!applicableWindow) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_window_expired',
        message: 'Cancellation window has expired'
      };
    }

    const refundAmount = (product.price.amount * applicableWindow.refundPercentage) / 100;
    const cancellationFee = product.price.amount - refundAmount;

    return {
      refund_amount: refundAmount,
      cancellation_fee: cancellationFee,
      refund_policy: this.getRefundPolicyName(applicableWindow.refundPercentage),
      message: applicableWindow.description,
      applicable_window: applicableWindow
    };
  }

  /**
   * Find the applicable cancellation window based on hours before service
   */
  private findApplicableWindow(windows: CancellationWindow[], hoursBeforeService: number): CancellationWindow | null {
    // Sort windows by hoursBeforeService in descending order (most restrictive first)
    const sortedWindows = [...windows].sort((a, b) => b.hoursBeforeService - a.hoursBeforeService);

    // Find the first window where hoursBeforeService >= the current hours before service
    return sortedWindows.find(window => hoursBeforeService >= window.hoursBeforeService) || null;
  }

  /**
   * Get human-readable refund policy name
   */
  private getRefundPolicyName(refundPercentage: number): string {
    if (refundPercentage === 100) {
      return 'full_refund';
    } else if (refundPercentage === 0) {
      return 'no_refund';
    } else {
      return `${refundPercentage}_percent_refund`;
    }
  }

  /**
   * Process cancellation request
   */
  public processCancellation(request: CancellationRequest): { product: Product; calculation: RefundCalculation } | null {
    let product: Product | undefined;

    // Try to find product by product_id first, then by booking_id
    if (request.product_id) {
      product = findProductById(request.product_id);
    }

    if (!product && request.booking_id) {
      product = findProductByBookingId(request.booking_id);
    }

    if (!product) {
      return null;
    }

    // Use provided booking time or current time
    const bookingTime = request.booking_time ? new Date(request.booking_time) : new Date();
    
    const calculation = this.calculateRefund(product, bookingTime);

    return { product, calculation };
  }

  /**
   * Validate cancellation request
   */
  public validateCancellationRequest(request: CancellationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.booking_id && !request.product_id) {
      errors.push('Either booking_id or product_id is required');
    }

    if (request.booking_time) {
      const bookingTime = new Date(request.booking_time);
      if (isNaN(bookingTime.getTime())) {
        errors.push('Invalid booking_time format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 