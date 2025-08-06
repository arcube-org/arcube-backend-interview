import { Product } from '../types';

export const sampleProducts: Product[] = [
  {
    id: 'PROD-001',
    title: 'JFK Terminal 4 Centurion Lounge Access',
    provider: 'dragonpass',
    type: 'lounge_access',
    price: {
      amount: 45.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 4,
          refundPercentage: 100,
          description: 'Full refund if cancelled within 4 hours of service time'
        },
        {
          hoursBeforeService: 24,
          refundPercentage: 50,
          description: '50% refund if cancelled between 4-24 hours before service time'
        }
      ],
      canCancel: true,
      cancelCondition: 'only_if_not_activated'
    },
    serviceDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    metadata: {
      bookingId: 'DP-456789012',
      loungeId: 'JFK-T4-CENTURION',
      loungeName: 'Centurion Lounge',
      terminal: 'T4',
      airport: 'JFK',
      validFrom: new Date('2024-01-20T14:00:00Z'),
      validTo: new Date('2024-01-20T22:00:00Z'),
      accessType: 'single_use',
      guestCount: 1,
      membershipType: 'premium'
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: 'PROD-002',
    title: 'LAX Tom Bradley International Terminal Lounge',
    provider: 'dragonpass',
    type: 'lounge_access',
    price: {
      amount: 35.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 2,
          refundPercentage: 100,
          description: 'Full refund if cancelled within 2 hours of service time'
        },
        {
          hoursBeforeService: 12,
          refundPercentage: 75,
          description: '75% refund if cancelled between 2-12 hours before service time'
        },
        {
          hoursBeforeService: 24,
          refundPercentage: 25,
          description: '25% refund if cancelled between 12-24 hours before service time'
        }
      ],
      canCancel: true
    },
    serviceDateTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
    metadata: {
      bookingId: 'DP-456789013',
      loungeId: 'LAX-TB-AMEX',
      loungeName: 'American Express Centurion Lounge',
      terminal: 'TB',
      airport: 'LAX',
      validFrom: new Date('2024-01-22T16:00:00Z'),
      validTo: new Date('2024-01-22T23:00:00Z'),
      accessType: 'single_use',
      guestCount: 2,
      membershipType: 'standard'
    },
    createdAt: new Date('2024-01-16T12:00:00Z'),
    updatedAt: new Date('2024-01-16T12:00:00Z')
  },
  {
    id: 'PROD-003',
    title: 'ORD Terminal 3 Priority Pass Lounge',
    provider: 'dragonpass',
    type: 'lounge_access',
    price: {
      amount: 25.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 6,
          refundPercentage: 100,
          description: 'Full refund if cancelled within 6 hours of service time'
        },
        {
          hoursBeforeService: 24,
          refundPercentage: 0,
          description: 'No refund after 6 hours before service time'
        }
      ],
      canCancel: true
    },
    serviceDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
    metadata: {
      bookingId: 'DP-456789014',
      loungeId: 'ORD-T3-PRIORITY',
      loungeName: 'Priority Pass Lounge',
      terminal: 'T3',
      airport: 'ORD',
      validFrom: new Date('2024-01-25T10:00:00Z'),
      validTo: new Date('2024-01-25T18:00:00Z'),
      accessType: 'single_use',
      guestCount: 1,
      membershipType: 'basic'
    },
    createdAt: new Date('2024-01-17T14:00:00Z'),
    updatedAt: new Date('2024-01-17T14:00:00Z')
  },
  {
    id: 'PROD-004',
    title: 'LHR Terminal 5 Plaza Premium Lounge',
    provider: 'dragonpass',
    type: 'lounge_access',
    price: {
      amount: 55.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 24,
          refundPercentage: 100,
          description: 'Full refund if cancelled 24 hours before access'
        },
        {
          hoursBeforeService: 6,
          refundPercentage: 50,
          description: '50% refund if cancelled between 6-24 hours before access'
        },
        {
          hoursBeforeService: 2,
          refundPercentage: 0,
          description: 'No refund if cancelled less than 6 hours before access'
        }
      ],
      canCancel: true
    },
    serviceDateTime: new Date(Date.now() + 30 * 60 * 60 * 1000), // 30 hours from now
    metadata: {
      bookingId: 'DP-456789015',
      loungeId: 'LHR-T5-PLAZA',
      loungeName: 'Plaza Premium Lounge',
      terminal: 'T5',
      airport: 'LHR',
      validFrom: new Date(Date.now() + 30 * 60 * 60 * 1000),
      validTo: new Date(Date.now() + 38 * 60 * 60 * 1000),
      accessType: 'single_use',
      guestCount: 1,
      membershipType: 'premium'
    },
    createdAt: new Date('2024-01-18T09:00:00Z'),
    updatedAt: new Date('2024-01-18T09:00:00Z')
  },
  {
    id: 'PROD-005',
    title: 'CDG Terminal 2E Air France Lounge',
    provider: 'dragonpass',
    type: 'lounge_access',
    price: {
      amount: 40.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 12,
          refundPercentage: 100,
          description: 'Full refund if cancelled within 12 hours of access time'
        },
        {
          hoursBeforeService: 24,
          refundPercentage: 75,
          description: '75% refund if cancelled between 12-24 hours before access'
        },
        {
          hoursBeforeService: 48,
          refundPercentage: 25,
          description: '25% refund if cancelled between 24-48 hours before access'
        }
      ],
      canCancel: true,
      cancelCondition: 'only_if_not_activated'
    },
    serviceDateTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
    metadata: {
      bookingId: 'DP-456789016',
      loungeId: 'CDG-T2E-AF',
      loungeName: 'Air France Lounge',
      terminal: 'T2E',
      airport: 'CDG',
      validFrom: new Date(Date.now() + 1 * 60 * 60 * 1000),
      validTo: new Date(Date.now() + 9 * 60 * 60 * 1000),
      accessType: 'single_use',
      guestCount: 2,
      membershipType: 'standard'
    },
    createdAt: new Date('2024-01-19T11:00:00Z'),
    updatedAt: new Date('2024-01-19T11:00:00Z')
  }
];

// Helper function to find product by booking ID
export const findProductByBookingId = (bookingId: string): Product | undefined => {
  return sampleProducts.find(product => product.metadata.bookingId === bookingId);
};

// Helper function to find product by product ID
export const findProductById = (productId: string): Product | undefined => {
  return sampleProducts.find(product => product.id === productId);
}; 