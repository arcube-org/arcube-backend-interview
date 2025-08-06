// Base entity interface for all database documents
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User roles
export type UserRole = 'admin' | 'partner' | 'user' | 'system';

// User entity
export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// Product types based on the JSON example
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
  cancelCondition?: string; // e.g., "only_if_not_activated"
}

// Product entity based on JSON structure
export interface Product extends BaseEntity {
  id: string; // Product identifier (e.g., "PROD-001")
  title: string;
  provider: string; // e.g., "dragonpass", "mozio", "airalo"
  type: ProductType;
  price: Price;
  status: ProductStatus;
  cancellationPolicy: CancellationPolicy;
  serviceDateTime: Date;
  activationDeadline?: Date; // For eSIM products
  metadata: {
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
  };
}

// Flight segment structure
export interface FlightSegment {
  segmentId: string;
  flightNumber: string;
  departure: string; // Airport code
  arrival: string; // Airport code
  departureTime: Date;
  arrivalTime: Date;
  operatingCarrier: string;
  passengerIds: string[];
}

// Customer information structure
export interface CustomerInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Order status
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';

// Order entity
export interface Order extends BaseEntity {
  pnr: string; // Passenger Name Record
  transactionId: string; // Payment transaction ID
  customer: CustomerInfo;
  products: string[]; // Array of Product IDs
  segments: FlightSegment[];
  status: OrderStatus;
  userId?: string; // Optional reference to User entity
  totalAmount?: number; // Calculated total from products
  totalCurrency?: string;
  notes?: string;
}

// Cancellation record entity (for audit trail)
export interface CancellationRecord extends BaseEntity {
  orderId: string;
  productId: string; // Reference to Product.id
  reason: string;
  requestSource: 'customer' | 'admin' | 'system';
  requestedBy: string; // User ID
  refundAmount: number;
  cancellationFee: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  correlationId: string;
  externalProviderResponse?: {
    provider: string;
    response: unknown;
    timestamp: Date;
  };
  notes?: string;
  cancelledAt: Date;
}

// Database indexes configuration
export interface DatabaseIndexes {
  users: {
    id: 1; // Unique index
    email: 1; // Unique index
    role: 1;
    isActive: 1;
  };
  products: {
    id: 1; // Unique index
    type: 1;
    status: 1;
    provider: 1;
    'metadata.bookingId': 1;
    'metadata.loungeId': 1;
  };
  orders: {
    id: 1; // Unique index
    pnr: 1;
    transactionId: 1; // Unique index
    'customer.email': 1;
    status: 1;
    userId: 1;
    createdAt: 1;
  };
  cancellationRecords: {
    id: 1; // Unique index
    orderId: 1;
    productId: 1;
    correlationId: 1;
    status: 1;
    createdAt: 1;
  };
}

// API request/response types
export interface CancelOrderRequest {
  orderId: string;
  reason?: string;
}

export interface CancelOrderResponse {
  orderId: string;
  cancelledAt: string;
  reason: string;
  status: 'cancelled';
}

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId?: string;
  timestamp?: string;
}

