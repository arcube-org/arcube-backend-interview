import mongoose, { Document, Schema } from 'mongoose';
import { Order, OrderStatus, CustomerInfo, FlightSegment } from '../types';

// Order document interface extending Mongoose Document
export interface OrderDocument extends Document {
  pnr: string;
  transactionId: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  products: mongoose.Types.ObjectId[];
  segments: Array<{
    segmentId: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    departureTime: Date;
    arrivalTime: Date;
    operatingCarrier: string;
    passengerIds: string[];
  }>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';
  userId?: mongoose.Types.ObjectId;
  totalAmount?: number;
  totalCurrency?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Customer info schema
const customerInfoSchema = new Schema<CustomerInfo>({
  email: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  phone: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Flight segment schema
const flightSegmentSchema = new Schema<FlightSegment>({
  segmentId: {
    type: String,
    required: [true, 'Segment ID is required'],
    trim: true,
  },
  flightNumber: {
    type: String,
    required: [true, 'Flight number is required'],
    trim: true,
  },
  departure: {
    type: String,
    required: [true, 'Departure airport is required'],
    uppercase: true,
    trim: true,
    maxlength: [3, 'Airport code must be 3 characters'],
  },
  arrival: {
    type: String,
    required: [true, 'Arrival airport is required'],
    uppercase: true,
    trim: true,
    maxlength: [3, 'Airport code must be 3 characters'],
  },
  departureTime: {
    type: Date,
    required: [true, 'Departure time is required'],
  },
  arrivalTime: {
    type: Date,
    required: [true, 'Arrival time is required'],
  },
  operatingCarrier: {
    type: String,
    required: [true, 'Operating carrier is required'],
    trim: true,
  },
  passengerIds: [{
    type: String,
    required: true,
    trim: true,
  }],
}, { _id: false });

// Order schema
const orderSchema = new Schema<OrderDocument>(
  {
    pnr: {
      type: String,
      required: [true, 'PNR is required'],
      trim: true,
      uppercase: true,
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
    },
    customer: {
      type: customerInfoSchema,
      required: [true, 'Customer information is required'],
    },
    products: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    }],
    segments: [flightSegmentSchema],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'expired'],
      default: 'pending',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    totalAmount: {
      type: Number,
      min: [0, 'Total amount cannot be negative'],
    },
    totalCurrency: {
      type: String,
      uppercase: true,
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

// Indexes
orderSchema.index({ pnr: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ createdAt: 1 });

// Virtual for order summary
orderSchema.virtual('orderSummary').get(function() {
  return {
    pnr: this.pnr,
    customerName: `${this.customer.firstName} ${this.customer.lastName}`,
    productCount: this.products.length,
    totalAmount: this.totalAmount,
    totalCurrency: this.totalCurrency,
    status: this.status,
  };
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Export the model
export const OrderModel = mongoose.model<OrderDocument>('Order', orderSchema); 