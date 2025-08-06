import mongoose, { Document, Schema } from 'mongoose';

export interface CancellationRecordDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  productId: string;
  reason: string;
  requestSource: 'customer' | 'admin' | 'system';
  requestedBy: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const externalProviderResponseSchema = new Schema({
  provider: {
    type: String,
    required: true,
    trim: true,
  },
  response: {
    type: Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const cancellationRecordSchema = new Schema<CancellationRecordDocument>(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    productId: {
      type: String,
      required: [true, 'Product ID is required'],
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Cancellation reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    requestSource: {
      type: String,
      enum: ['customer', 'admin', 'system'],
      required: [true, 'Request source is required'],
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requested by user is required'],
    },
    refundAmount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount cannot be negative'],
    },
    cancellationFee: {
      type: Number,
      required: [true, 'Cancellation fee is required'],
      min: [0, 'Cancellation fee cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    correlationId: {
      type: String,
      required: [true, 'Correlation ID is required'],
      trim: true,
    },
    externalProviderResponse: externalProviderResponseSchema,
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    cancelledAt: {
      type: Date,
      required: [true, 'Cancellation date is required'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'cancellation_records',
  }
);

// Indexes
cancellationRecordSchema.index({ orderId: 1 });
cancellationRecordSchema.index({ productId: 1 });
cancellationRecordSchema.index({ correlationId: 1 });
cancellationRecordSchema.index({ status: 1 });
cancellationRecordSchema.index({ createdAt: 1 });
cancellationRecordSchema.index({ requestedBy: 1 });

cancellationRecordSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const CancellationRecordModel = mongoose.model<CancellationRecordDocument>('CancellationRecord', cancellationRecordSchema); 