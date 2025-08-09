import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface TokenDocument extends Document {
  id: string;
  userId: string;
  tokenType: 'api_key' | 'service_token';
  tokenHash: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  isBlocked: boolean;
  lastUsedAt?: Date;
  expiresAt?: number; // Epoch timestamp
  createdAt: Date;
  updatedAt: Date;
}

// Token schema
const tokenSchema = new Schema<TokenDocument>(
  {
    id: {
      type: String,
      required: [true, 'Token ID is required'],
      default: () => uuidv4(),
      trim: true,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
    },
    tokenType: {
      type: String,
      enum: ['api_key', 'service_token'],
      required: [true, 'Token type is required'],
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Token name is required'],
      trim: true,
      maxlength: [100, 'Token name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    permissions: [{
      type: String,
      required: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Number, // Store as epoch timestamp
    },
  },
  {
    timestamps: true,
    collection: 'tokens',
  }
);

// Indexes
tokenSchema.index({ id: 1 }, { unique: true });
tokenSchema.index({ userId: 1 });
tokenSchema.index({ tokenHash: 1 }, { unique: true });
tokenSchema.index({ tokenType: 1 });
tokenSchema.index({ isActive: 1 });
tokenSchema.index({ isBlocked: 1 });
tokenSchema.index({ expiresAt: 1 });

// Compound indexes for efficient queries
tokenSchema.index({ userId: 1, tokenType: 1 });
tokenSchema.index({ isActive: 1, isBlocked: 1 });

// Virtual for token status
tokenSchema.virtual('status').get(function() {
  if (this.isBlocked) return 'blocked';
  if (!this.isActive) return 'inactive';
  if (this.expiresAt && this.expiresAt < Math.floor(Date.now() / 1000)) return 'expired';
  return 'active';
});

// Ensure virtual fields are serialized
tokenSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    delete ret.tokenHash; // Never include token hash in JSON
    return ret;
  },
});

// Export the model
export const TokenModel = mongoose.model<TokenDocument>('Token', tokenSchema); 