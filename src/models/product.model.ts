import mongoose, { Document, Schema } from 'mongoose';
import { Product, ProductType, ProductStatus, Price, CancellationPolicy, CancellationWindow } from '../types';

// Product document interface extending Mongoose Document
export interface ProductDocument extends Document {
  id: string;
  title: string;
  provider: string;
  type: 'airport_transfer' | 'lounge_access' | 'esim' | 'meal' | 'insurance' | 'transport';
  price: {
    amount: number;
    currency: string;
  };
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';
  cancellationPolicy: {
    windows: Array<{
      hoursBeforeService: number;
      refundPercentage: number;
      description: string;
    }>;
    canCancel: boolean;
    cancelCondition?: string;
  };
  serviceDateTime: Date;
  activationDeadline?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Price schema
const priceSchema = new Schema<Price>({
  amount: {
    type: Number,
    required: true,
    min: [0, 'Price amount cannot be negative'],
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    minlength: [3, 'Currency must be 3 characters'],
    maxlength: [3, 'Currency must be 3 characters'],
  },
}, { _id: false });

// Cancellation window schema
const cancellationWindowSchema = new Schema<CancellationWindow>({
  hoursBeforeService: {
    type: Number,
    required: true,
    min: [0, 'Hours before service cannot be negative'],
  },
  refundPercentage: {
    type: Number,
    required: true,
    min: [0, 'Refund percentage cannot be negative'],
    max: [100, 'Refund percentage cannot exceed 100'],
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

// Cancellation policy schema
const cancellationPolicySchema = new Schema<CancellationPolicy>({
  windows: [cancellationWindowSchema],
  canCancel: {
    type: Boolean,
    default: true,
  },
  cancelCondition: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Metadata schema (flexible object)
const metadataSchema = new Schema({
  bookingId: String,
  reservationId: String,
  confirmationNumber: String,
  loungeId: String,
  loungeName: String,
  terminal: String,
  airport: String,
  validFrom: Date,
  validTo: Date,
  accessType: String,
  guestCount: Number,
  membershipType: String,
  pickup: {
    location: String,
    datetime: Date,
  },
  dropoff: {
    location: String,
    datetime: Date,
  },
  vehicle: {
    type: String,
    capacity: Number,
    provider: String,
  },
  searchId: String,
  resultId: String,
  orderId: String,
  orderCode: String,
  packageId: String,
  iccid: String,
  qrCode: String,
  country: String,
  countryCode: String,
  dataAmount: String,
  validityDays: Number,
  isActivated: Boolean,
  activatedAt: Date,
  simStatus: String,
}, { 
  _id: false,
  strict: false, // Allow additional fields
});

// Product schema
const productSchema = new Schema<ProductDocument>(
  {
    id: {
      type: String,
      required: [true, 'Product ID is required'],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['airport_transfer', 'lounge_access', 'esim', 'meal', 'insurance', 'transport'],
      required: [true, 'Product type is required'],
    },
    price: {
      type: priceSchema,
      required: [true, 'Price is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'expired'],
      default: 'pending',
    },
    cancellationPolicy: {
      type: cancellationPolicySchema,
      required: [true, 'Cancellation policy is required'],
    },
    serviceDateTime: {
      type: Date,
      required: [true, 'Service date time is required'],
    },
    activationDeadline: {
      type: Date,
    },
    metadata: {
      type: metadataSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

// Indexes
productSchema.index({ type: 1 });
productSchema.index({ status: 1 });
productSchema.index({ provider: 1 });
productSchema.index({ 'metadata.bookingId': 1 });
productSchema.index({ 'metadata.loungeId': 1 });
productSchema.index({ serviceDateTime: 1 });

// Ensure virtual fields are serialized
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Export the model
export const ProductModel = mongoose.model<ProductDocument>('Product', productSchema); 