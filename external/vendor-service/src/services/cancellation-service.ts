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

    // Provider-specific cancellation checks
    const providerCheck = this.checkProviderSpecificConditions(product, hoursBeforeService);
    if (providerCheck) {
      return providerCheck;
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
   * Check provider-specific cancellation conditions
   */
  private checkProviderSpecificConditions(product: Product, hoursBeforeService: number): RefundCalculation | null {
    switch (product.provider) {
      case 'airalo':
        return this.checkAiraloCancellationConditions(product, hoursBeforeService);
      case 'mozio':
        return this.checkMozioCancellationConditions(product, hoursBeforeService);
      case 'dragonpass':
        return this.checkDragonPassCancellationConditions(product, hoursBeforeService);
      default:
        return null;
    }
  }

  /**
   * Check Airalo eSIM specific cancellation conditions
   */
  private checkAiraloCancellationConditions(product: Product, hoursBeforeService: number): RefundCalculation | null {
    // Check if eSIM is already activated
    if (product.metadata.isActivated) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_activated',
        message: 'eSIM has been activated and cannot be cancelled'
      };
    }

    // Check if activation deadline has passed
    if (product.activationDeadline && new Date() > product.activationDeadline) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_deadline_passed',
        message: 'eSIM activation deadline has passed and cannot be cancelled'
      };
    }

    // Check if service time has passed (eSIM purchase time)
    if (hoursBeforeService < 0) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_service_passed',
        message: 'eSIM service time has passed and cannot be cancelled'
      };
    }

    return null;
  }

  /**
   * Check Mozio airport transfer specific cancellation conditions
   */
  private checkMozioCancellationConditions(product: Product, hoursBeforeService: number): RefundCalculation | null {
    // Check if service time has passed
    if (hoursBeforeService < 0) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_service_passed',
        message: 'Transfer service time has passed and cannot be cancelled'
      };
    }

    // Check if pickup time is too close (less than 30 minutes)
    if (hoursBeforeService < 0.5) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_too_close',
        message: 'Transfer cannot be cancelled within 30 minutes of pickup time'
      };
    }

    // Check if vehicle is already dispatched (simulated check)
    if (hoursBeforeService < 1 && this.isVehicleDispatched(product)) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_vehicle_dispatched',
        message: 'Vehicle has been dispatched and transfer cannot be cancelled'
      };
    }

    return null;
  }

  /**
   * Check DragonPass lounge access specific cancellation conditions
   */
  private checkDragonPassCancellationConditions(product: Product, hoursBeforeService: number): RefundCalculation | null {
    // Check if service time has passed
    if (hoursBeforeService < 0) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_service_passed',
        message: 'Lounge access time has passed and cannot be cancelled'
      };
    }

    // Check if lounge access has been used (simulated check)
    if (product.metadata.accessType === 'single_use' && this.isLoungeAccessUsed(product)) {
      return {
        refund_amount: 0,
        cancellation_fee: product.price.amount,
        refund_policy: 'no_refund_already_used',
        message: 'Lounge access has already been used and cannot be cancelled'
      };
    }

    return null;
  }

  /**
   * Simulate vehicle dispatch check for Mozio
   */
  private isVehicleDispatched(product: Product): boolean {
    // Simulate vehicle dispatch based on time proximity
    const currentTime = new Date();
    const serviceTime = product.serviceDateTime;
    const hoursBeforeService = (serviceTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    
    // Simulate that vehicle is dispatched if less than 1 hour before service
    return hoursBeforeService < 1;
  }

  /**
   * Simulate lounge access usage check for DragonPass
   */
  private isLoungeAccessUsed(product: Product): boolean {
    // Simulate lounge access usage based on service time proximity
    const currentTime = new Date();
    const serviceTime = product.serviceDateTime;
    const hoursBeforeService = (serviceTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    
    // Simulate that lounge access is used if service time has passed
    return hoursBeforeService < 0;
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
   * Validate cancellation request with provider-specific validations
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

    // Provider-specific validations
    if (request.booking_id || request.product_id) {
      const product = request.product_id 
        ? findProductById(request.product_id) 
        : findProductByBookingId(request.booking_id!);
      
      if (product) {
        const providerErrors = this.validateProviderSpecificRequest(request, product);
        errors.push(...providerErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate provider-specific cancellation request requirements
   */
  private validateProviderSpecificRequest(request: CancellationRequest, product: Product): string[] {
    const errors: string[] = [];

    switch (product.provider) {
      case 'mozio':
        // Mozio might require lounge_id for specific lounge cancellations
        if (product.type === 'lounge_access' && !request.lounge_id) {
          errors.push('lounge_id is required for Mozio lounge access cancellations');
        }
        break;
      
      case 'dragonpass':
        // DragonPass might require lounge_id for specific lounge cancellations
        if (product.type === 'lounge_access' && !request.lounge_id) {
          errors.push('lounge_id is required for DragonPass lounge access cancellations');
        }
        break;
      
      case 'airalo':
        // Airalo doesn't require additional fields for eSIM cancellations
        break;
      
      default:
        break;
    }

    return errors;
  }

  /**
   * Get provider-specific cancellation information
   */
  public getProviderCancellationInfo(provider: string): {
    supported: boolean;
    features: string[];
    restrictions: string[];
  } {
    switch (provider) {
      case 'airalo':
        return {
          supported: true,
          features: [
            'eSIM cancellation before activation',
            'Partial refunds based on activation deadline',
            'Full refund if not activated within 72 hours'
          ],
          restrictions: [
            'Cannot cancel after eSIM activation',
            'Cannot cancel after activation deadline',
            'Processing fees apply for late cancellations'
          ]
        };
      
      case 'mozio':
        return {
          supported: true,
          features: [
            'Airport transfer cancellation',
            'Full refunds for early cancellations',
            'Partial refunds based on pickup time proximity'
          ],
          restrictions: [
            'Cannot cancel within 30 minutes of pickup',
            'Cannot cancel if vehicle is dispatched',
            'Cannot cancel after service time'
          ]
        };
      
      case 'dragonpass':
        return {
          supported: true,
          features: [
            'Lounge access cancellation',
            'Full refunds for early cancellations',
            'Partial refunds based on access time'
          ],
          restrictions: [
            'Cannot cancel after lounge access is used',
            'Cannot cancel after service time',
            'Single-use passes cannot be cancelled after use'
          ]
        };
      
      default:
        return {
          supported: false,
          features: [],
          restrictions: ['Provider not supported for cancellations']
        };
    }
  }
} 