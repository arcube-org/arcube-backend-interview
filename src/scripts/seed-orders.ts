#!/usr/bin/env ts-node

import { config } from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { OrderModel, UserModel } from '../models';
import { env } from '../config/environment';
import { Order, OrderStatus, FlightSegment } from '../types';

// Sample products from vendor service (complete with cancellation policies)
const sampleProducts = [
  // DragonPass Lounge Access Products
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
    createdAt: new Date('2025-08-06T10:00:00Z'),
    updatedAt: new Date('2025-08-06T10:00:00Z')
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
    createdAt: new Date('2025-08-06T12:00:00Z'),
    updatedAt: new Date('2025-08-06T12:00:00Z')
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
    createdAt: new Date('2025-08-06T14:00:00Z'),
    updatedAt: new Date('2025-08-06T14:00:00Z')
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
    createdAt: new Date('2025-08-06T09:00:00Z'),
    updatedAt: new Date('2025-08-06T09:00:00Z')
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
    createdAt: new Date('2025-08-06T11:00:00Z'),
    updatedAt: new Date('2025-08-06T11:00:00Z')
  },

  // Mozio Airport Transfer Products
  {
    id: 'PROD-006',
    title: 'Airport Transfer - JFK to Manhattan',
    provider: 'mozio',
    type: 'airport_transfer',
    price: {
      amount: 85.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 48,
          refundPercentage: 100,
          description: 'Full refund'
        },
        {
          hoursBeforeService: 12,
          refundPercentage: 80,
          description: '80% refund (20% cancellation fee)'
        },
        {
          hoursBeforeService: 2,
          refundPercentage: 0,
          description: 'No refund - too close to pickup time'
        }
      ],
      canCancel: true
    },
    serviceDateTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
    metadata: {
      bookingId: 'MZ-789456123',
      reservationId: '77acffc5559c4582ba8d457d968db194',
      confirmationNumber: 'MZDT-365316',
      pickup: {
        location: 'JFK Airport, Terminal 1',
        datetime: new Date(Date.now() + 8 * 60 * 60 * 1000)
      },
      dropoff: {
        location: 'Manhattan Hotel, 123 5th Ave',
        datetime: new Date(Date.now() + 9.5 * 60 * 60 * 1000)
      },
      vehicle: {
        type: 'Sedan',
        capacity: 4,
        provider: 'Daytrip'
      },
      searchId: '4ff24ad40ada4c83b12048eebef680ee',
      resultId: 'cd11ca98f916d3ae6b9de9e251b92d2b'
    },
    createdAt: new Date('2025-08-06T08:00:00Z'),
    updatedAt: new Date('2025-08-06T08:00:00Z')
  },
  {
    id: 'PROD-007',
    title: 'Airport Transfer - LAX to Beverly Hills',
    provider: 'mozio',
    type: 'airport_transfer',
    price: {
      amount: 95.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 72,
          refundPercentage: 100,
          description: 'Full refund'
        },
        {
          hoursBeforeService: 24,
          refundPercentage: 85,
          description: '85% refund (15% cancellation fee)'
        },
        {
          hoursBeforeService: 6,
          refundPercentage: 50,
          description: '50% refund (50% cancellation fee)'
        },
        {
          hoursBeforeService: 1,
          refundPercentage: 0,
          description: 'No refund - too close to pickup time'
        }
      ],
      canCancel: true
    },
    serviceDateTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    metadata: {
      bookingId: 'MZ-789456124',
      reservationId: '88bdffc6660d5693cb9e568e079ec205',
      confirmationNumber: 'MZDT-365317',
      pickup: {
        location: 'LAX Airport, Terminal 7',
        datetime: new Date(Date.now() + 12 * 60 * 60 * 1000)
      },
      dropoff: {
        location: 'Beverly Hills Hotel, 9641 Sunset Blvd',
        datetime: new Date(Date.now() + 13.5 * 60 * 60 * 1000)
      },
      vehicle: {
        type: 'SUV',
        capacity: 6,
        provider: 'Blacklane'
      },
      searchId: '5gg35be51beb5d94c23159ffcfg791ff',
      resultId: 'de22db09a027e4bf7c0ef0f362c03e3c'
    },
    createdAt: new Date('2025-08-06T09:00:00Z'),
    updatedAt: new Date('2025-08-06T09:00:00Z')
  },
  {
    id: 'PROD-008',
    title: 'Airport Transfer - ORD to Downtown Chicago',
    provider: 'mozio',
    type: 'airport_transfer',
    price: {
      amount: 75.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 24,
          refundPercentage: 100,
          description: 'Full refund'
        },
        {
          hoursBeforeService: 6,
          refundPercentage: 70,
          description: '70% refund (30% cancellation fee)'
        },
        {
          hoursBeforeService: 2,
          refundPercentage: 0,
          description: 'No refund - too close to pickup time'
        }
      ],
      canCancel: true
    },
    serviceDateTime: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
    metadata: {
      bookingId: 'MZ-789456125',
      reservationId: '99ceffd7771e6704dc0f679f18afd316',
      confirmationNumber: 'MZDT-365318',
      pickup: {
        location: 'ORD Airport, Terminal 3',
        datetime: new Date(Date.now() + 18 * 60 * 60 * 1000)
      },
      dropoff: {
        location: 'Downtown Chicago Hotel, 123 Michigan Ave',
        datetime: new Date(Date.now() + 19.5 * 60 * 60 * 1000)
      },
      vehicle: {
        type: 'Sedan',
        capacity: 4,
        provider: 'Daytrip'
      },
      searchId: '6hh46cf62cfc6e05d34260ggdgh802gg',
      resultId: 'ef33ec10b138f5cg8d1fg0g473d14f4d'
    },
    createdAt: new Date('2025-08-06T10:00:00Z'),
    updatedAt: new Date('2025-08-06T10:00:00Z')
  },

  // Airalo eSIM Products
  {
    id: 'PROD-009',
    title: 'eSIM USA - 5GB 30 Days',
    provider: 'airalo',
    type: 'esim',
    price: {
      amount: 22.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 72,
          refundPercentage: 100,
          description: 'Full refund - eSIM not yet activated'
        },
        {
          hoursBeforeService: 24,
          refundPercentage: 75,
          description: '75% refund (25% processing fee)'
        },
        {
          hoursBeforeService: 0,
          refundPercentage: 0,
          description: 'No refund - eSIM activated or activation deadline passed'
        }
      ],
      canCancel: true,
      cancelCondition: 'only_if_not_activated'
    },
    serviceDateTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    activationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    metadata: {
      orderId: '197564',
      orderCode: '20250902-197564',
      packageId: 'change-30days-5gb',
      iccid: '873000000000015081',
      qrCode: 'LPA:1$lpa.airalo.com$TEST123',
      country: 'United States',
      countryCode: 'US',
      dataAmount: '5 GB',
      validityDays: 30,
      activationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActivated: false,
      activatedAt: null,
      simStatus: 'ready_for_activation'
    },
    createdAt: new Date('2025-08-06T12:00:00Z'),
    updatedAt: new Date('2025-08-06T12:00:00Z')
  },
  {
    id: 'PROD-010',
    title: 'eSIM Europe - 10GB 15 Days',
    provider: 'airalo',
    type: 'esim',
    price: {
      amount: 35.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 48,
          refundPercentage: 100,
          description: 'Full refund - eSIM not yet activated'
        },
        {
          hoursBeforeService: 12,
          refundPercentage: 80,
          description: '80% refund (20% processing fee)'
        },
        {
          hoursBeforeService: 0,
          refundPercentage: 0,
          description: 'No refund - eSIM activated or activation deadline passed'
        }
      ],
      canCancel: true,
      cancelCondition: 'only_if_not_activated'
    },
    serviceDateTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
    activationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    metadata: {
      orderId: '197565',
      orderCode: '20250902-197565',
      packageId: 'europe-15days-10gb',
      iccid: '873000000000015082',
      qrCode: 'LPA:1$lpa.airalo.com$TEST456',
      country: 'Europe',
      countryCode: 'EU',
      dataAmount: '10 GB',
      validityDays: 15,
      activationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActivated: false,
      activatedAt: null,
      simStatus: 'ready_for_activation'
    },
    createdAt: new Date('2025-08-06T14:00:00Z'),
    updatedAt: new Date('2025-08-06T14:00:00Z')
  },
  {
    id: 'PROD-011',
    title: 'eSIM Asia - 3GB 7 Days',
    provider: 'airalo',
    type: 'esim',
    price: {
      amount: 18.00,
      currency: 'USD'
    },
    status: 'confirmed',
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeService: 24,
          refundPercentage: 100,
          description: 'Full refund - eSIM not yet activated'
        },
        {
          hoursBeforeService: 6,
          refundPercentage: 60,
          description: '60% refund (40% processing fee)'
        },
        {
          hoursBeforeService: 0,
          refundPercentage: 0,
          description: 'No refund - eSIM activated or activation deadline passed'
        }
      ],
      canCancel: true,
      cancelCondition: 'only_if_not_activated'
    },
    serviceDateTime: new Date(Date.now() + 10 * 60 * 60 * 1000), // 10 hours from now
    activationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    metadata: {
      orderId: '197566',
      orderCode: '20250902-197566',
      packageId: 'asia-7days-3gb',
      iccid: '873000000000015083',
      qrCode: 'LPA:1$lpa.airalo.com$TEST789',
      country: 'Asia',
      countryCode: 'AS',
      dataAmount: '3 GB',
      validityDays: 7,
      activationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      isActivated: false,
      activatedAt: null,
      simStatus: 'ready_for_activation'
    },
    createdAt: new Date('2025-08-06T16:00:00Z'),
    updatedAt: new Date('2025-08-06T16:00:00Z')
  }
];

// Sample flight segments
const sampleSegments: FlightSegment[] = [
  {
    segmentId: 'SEG1',
    flightNumber: 'EK123',
    departure: 'DXB',
    arrival: 'JFK',
    departureTime: new Date('2025-09-01T08:00:00Z'),
    arrivalTime: new Date('2025-09-01T14:00:00Z'),
    operatingCarrier: 'EK',
    passengerIds: ['PAX1', 'PAX2']
  },
  {
    segmentId: 'SEG2',
    flightNumber: 'EK456',
    departure: 'JFK',
    arrival: 'LAX',
    departureTime: new Date('2025-09-01T16:00:00Z'),
    arrivalTime: new Date('2025-09-01T19:00:00Z'),
    operatingCarrier: 'EK',
    passengerIds: ['PAX1', 'PAX2']
  },
  {
    segmentId: 'SEG3',
    flightNumber: 'BA789',
    departure: 'LHR',
    arrival: 'CDG',
    departureTime: new Date('2025-09-15T10:00:00Z'),
    arrivalTime: new Date('2025-09-15T13:00:00Z'),
    operatingCarrier: 'BA',
    passengerIds: ['PAX1']
  },
  {
    segmentId: 'SEG4',
    flightNumber: 'AF101',
    departure: 'CDG',
    arrival: 'LHR',
    departureTime: new Date('2025-09-20T14:00:00Z'),
    arrivalTime: new Date('2025-09-20T15:30:00Z'),
    operatingCarrier: 'AF',
    passengerIds: ['PAX1']
  }
];

// Sample orders data
const sampleOrders: Array<{
  pnr: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  products: string[];
  segments: FlightSegment[];
  status: OrderStatus;
  notes?: string;
}> = [
  // Order 1: Vijaykumar's order with DragonPass and Mozio products
  {
    pnr: 'ABC123456',
    customer: {
      email: 'vijaykumar4495@gmail.com',
      firstName: 'Vijaykumar',
      lastName: 'Prakash',
      phone: '+91-9876543210'
    },
    products: ['PROD-001', 'PROD-006', 'PROD-009'], // JFK Lounge + JFK Transfer + USA eSIM
    segments: [sampleSegments[0]!, sampleSegments[1]!], // DXB-JFK-LAX
    status: 'confirmed',
    notes: 'Business trip to USA with lounge access and airport transfer'
  },
  
  // Order 2: Vijaykumar's second order with Airalo products
  {
    pnr: 'DEF789012',
    customer: {
      email: 'vijaykumar4495@gmail.com',
      firstName: 'Vijaykumar',
      lastName: 'Prakash',
      phone: '+91-9876543210'
    },
    products: ['PROD-010', 'PROD-011'], // Europe eSIM + Asia eSIM
    segments: [sampleSegments[2]!, sampleSegments[3]!], // LHR-CDG-LHR
    status: 'confirmed',
    notes: 'Multi-country trip with eSIM packages'
  },
  
  // Order 3: Vijay Games' order with DragonPass and Mozio products
  {
    pnr: 'GHI345678',
    customer: {
      email: 'gamebyvijay@gmail.com',
      firstName: 'Vijay',
      lastName: 'Games',
      phone: '+44-1234567890'
    },
    products: ['PROD-004', 'PROD-007'], // LHR Lounge + LAX Transfer
    segments: [sampleSegments[1]!], // JFK-LAX
    status: 'confirmed',
    notes: 'Luxury travel with premium lounge access'
  },
  
  // Order 4: Vijay Games' second order with mixed products
  {
    pnr: 'JKL901234',
    customer: {
      email: 'gamebyvijay@gmail.com',
      firstName: 'Vijay',
      lastName: 'Games',
      phone: '+44-1234567890'
    },
    products: ['PROD-002', 'PROD-005', 'PROD-008'], // LAX Lounge + CDG Lounge + ORD Transfer
    segments: [sampleSegments[2]!, sampleSegments[3]!], // LHR-CDG-LHR
    status: 'pending',
    notes: 'Multi-city business trip with lounge access'
  },
  
  // Order 5: Vijaykumar's third order (cancelled)
  {
    pnr: 'MNO567890',
    customer: {
      email: 'vijaykumar4495@gmail.com',
      firstName: 'Vijaykumar',
      lastName: 'Prakash',
      phone: '+91-9876543210'
    },
    products: ['PROD-003'], // ORD Lounge
    segments: [sampleSegments[0]!], // DXB-JFK
    status: 'cancelled',
    notes: 'Cancelled due to flight change'
  },
  
  // Order 6: Vijay Games' third order (refunded)
  {
    pnr: 'PQR234567',
    customer: {
      email: 'gamebyvijay@gmail.com',
      firstName: 'Vijay',
      lastName: 'Games',
      phone: '+44-1234567890'
    },
    products: ['PROD-009'], // USA eSIM
    segments: [],
    status: 'refunded',
    notes: 'Refunded due to activation issues'
  }
];

const seedOrders = async (): Promise<void> => {
  try {
    console.log('🛒 Starting orders seeding...');

    // Get all users from database
    const users = await UserModel.find({ role: 'user' }).limit(10);
    
    if (users.length < 2) {
      console.log('⚠️  Not enough users found. Please run the main seed script first to create users.');
      console.log(`   Found ${users.length} users, need at least 2 users.`);
      return;
    }

    // Use the first two users for creating orders
    const [user1, user2] = users;
    
    if (!user1 || !user2) {
      console.log('⚠️  Failed to get users from database.');
      return;
    }
    
    console.log(`✅ Found users: ${user1.name} (${user1.email}) and ${user2.name} (${user2.email})`);

    // Check if orders already exist
    const existingOrders = await OrderModel.countDocuments();
    if (existingOrders > 0) {
      console.log(`✅ Database already has ${existingOrders} order(s). Skipping seed.`);
      return;
    }

    // Create orders
    const createdOrders = [];
    for (const orderData of sampleOrders) {
      // Calculate total amount from products using the actual sample products
      const productDetails = orderData.products.map((productId: string) => 
        sampleProducts.find(p => p.id === productId)
      ).filter(Boolean);
      
      const totalAmount = productDetails.reduce((sum, product) => sum + (product?.price.amount || 0), 0);
      
      // Assign user ID based on customer email - match with actual users from database
      let userId: string;
      if (orderData.customer.email === user1.email) {
        userId = user1.id;
      } else if (orderData.customer.email === user2.email) {
        userId = user2.id;
      } else {
        // If email doesn't match, assign to first user and update the email
        userId = user1.id;
        orderData.customer.email = user1.email;
        orderData.customer.firstName = user1.name.split(' ')[0] || user1.name;
        orderData.customer.lastName = user1.name.split(' ').slice(1).join(' ') || '';
      }

      const order = new OrderModel({
        ...orderData,
        id: uuidv4(),
        transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        userId,
        totalAmount,
        totalCurrency: 'USD'
      });

      const savedOrder = await order.save();
      createdOrders.push(savedOrder);
    }

    console.log(`✅ Successfully seeded database with ${createdOrders.length} orders:`);
    
    // Group orders by user
    const ordersByUser = createdOrders.reduce((acc, order) => {
      const userEmail = order.customer.email;
      if (!acc[userEmail]) {
        acc[userEmail] = [];
      }
      acc[userEmail].push(order);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(ordersByUser).forEach(([email, orders]) => {
      console.log(`\n👤 ${email}:`);
      orders.forEach(order => {
        const productNames = order.products.map((productId: string) => 
          sampleProducts.find(p => p.id === productId)?.title || productId
        ).join(', ');
        console.log(`   - PNR: ${order.pnr} | Status: ${order.status} | Products: ${productNames}`);
      });
    });

    // Summary statistics
    const statusCounts = await OrderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('\n📊 Order Status Summary:');
    statusCounts.forEach(({ _id, count }) => {
      console.log(`   - ${_id}: ${count}`);
    });

    const totalRevenue = createdOrders
      .filter(order => order.status === 'confirmed')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    console.log(`\n💰 Total Revenue (confirmed orders): $${totalRevenue.toFixed(2)} USD`);

    // Show products by provider with cancellation policies
    const productsByProvider = sampleProducts.reduce((acc, product) => {
      if (!acc[product.provider]) {
        acc[product.provider] = [];
      }
      if (product && product.provider) {
        // @ts-ignore
        acc[product.provider].push(product);
      }
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n🏪 Products by Provider (with Cancellation Policies):');
    Object.entries(productsByProvider).forEach(([provider, products]) => {
      console.log(`\n   ${provider.toUpperCase()}: ${products.length} products`);
      products.forEach(product => {
        if (product && product.price) {
          console.log(`     - ${product.title} ($${product.price.amount} ${product.price.currency})`);
          console.log(`       Cancellation: ${product.cancellationPolicy.canCancel ? 'Allowed' : 'Not Allowed'}`);
          if (product.cancellationPolicy.canCancel) {
            product.cancellationPolicy.windows.forEach((window: any, index: number) => {
              console.log(`${index + 1}. ${window.hoursBeforeService}h before: ${window.refundPercentage}% refund - ${window.description}`);
            });
          }
        }
      });
    });

  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    throw error;
  }
};

const clearOrders = async (): Promise<number> => {
  try {
    const result = await OrderModel.deleteMany({});
    console.log(`🗑️  Cleared ${result.deletedCount} order(s)`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error clearing orders:', error);
    throw error;
  }
};

const checkOrdersStatus = async (): Promise<void> => {
  try {
    const orderCount = await OrderModel.countDocuments();
    const ordersByStatus = await OrderModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log(`\n📦 Orders Database Status:`);
    console.log(`Total Orders: ${orderCount}`);
    
    if (ordersByStatus.length > 0) {
      console.log(`   Orders by Status:`);
      ordersByStatus.forEach(({ _id, count }) => {
        console.log(`     - ${_id}: ${count}`);
      });
    }

    // Show orders by user
    const ordersByUser = await OrderModel.aggregate([
      {
        $group: {
          _id: '$customer.email',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    if (ordersByUser.length > 0) {
      console.log(`\n   Orders by User:`);
      ordersByUser.forEach(({ _id, count, totalAmount }) => {
        console.log(`     - ${_id}: ${count} orders, $${totalAmount?.toFixed(2) || '0.00'} USD`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking orders status:', error);
  }
};

const runSeedOrders = async (): Promise<void> => {
  try {
    console.log('🚀 Starting orders seeding script...');
    console.log(`📡 Connecting to database: ${env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    // Connect to database
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Run seed
    await seedOrders();
    
    // Check status
    await checkOrdersStatus();
    
    console.log('✅ Orders seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Orders seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seed script
if (require.main === module) {
  runSeedOrders();
}

export { seedOrders, clearOrders, checkOrdersStatus }; 