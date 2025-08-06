// Product types based on the main application
export type ProductType = 'airport_transfer' | 'lounge_access' | 'esim' | 'meal' | 'insurance' | 'transport';

// Product status
export type ProductStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';

// Price structure
export interface Price {
  amount: number;
  currency: string;
}

// Cancellation window structure
export interface CancellationWindow {
  hoursBeforeService: number;
  refundPercentage: number;
  description: string;
}

// Cancellation policy structure
export interface CancellationPolicy {
  windows: CancellationWindow[];
  canCancel: boolean;
  cancelCondition?: string;
}

// Product metadata structure
export interface ProductMetadata {
  bookingId?: string;
  reservationId?: string;
  confirmationNumber?: string;
  loungeId?: string;
  loungeName?: string;
  terminal?: string;
  airport?: string;
  validFrom?: Date;
  validTo?: Date;
  accessType?: string;
  guestCount?: number;
  membershipType?: string;
  pickup?: {
    location: string;
    datetime: Date;
  };
  dropoff?: {
    location: string;
    datetime: Date;
  };
  vehicle?: {
    type: string;
    capacity: number;
    provider: string;
  };
  searchId?: string;
  resultId?: string;
  orderId?: string;
  orderCode?: string;
  packageId?: string;
  iccid?: string;
  qrCode?: string;
  country?: string;
  countryCode?: string;
  dataAmount?: string;
  validityDays?: number;
  isActivated?: boolean;
  activatedAt?: Date | null;
  simStatus?: string;
  [key: string]: unknown;
}

// Product entity
export interface Product {
  id: string;
  title: string;
  provider: string;
  type: ProductType;
  price: Price;
  status: ProductStatus;
  cancellationPolicy: CancellationPolicy;
  serviceDateTime: Date;
  activationDeadline?: Date;
  metadata: ProductMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Cancellation request
export interface CancellationRequest {
  booking_id: string;
  lounge_id?: string;
  booking_time?: string;
  product_id?: string;
}

// Cancellation response
export interface CancellationResponse {
  status: 'success' | 'error';
  cancellation_id: string;
  booking_id: string;
  lounge_id?: string | undefined;
  refund_amount: number;
  cancellation_fee: number;
  currency: string;
  refund_policy: string;
  estimated_refund_time: string;
  message: string;
}

// Refund calculation result
export interface RefundCalculation {
  refund_amount: number;
  cancellation_fee: number;
  refund_policy: string;
  message: string;
  applicable_window?: CancellationWindow;
} 