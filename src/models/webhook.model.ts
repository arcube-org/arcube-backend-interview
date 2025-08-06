import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CancellationEventType, RetryConfiguration } from '../types/webhook.types';

export interface WebhookDocument extends Document {
  id: string;
  name: string;
  url: string;
  events: CancellationEventType[];
  headers?: Record<string, string>;
  isActive: boolean;
  secret?: string;
  retryConfig: RetryConfiguration;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const retryConfigSchema = new Schema({
  maxRetries: {
    type: Number,
    required: true,
    default: 3,
    min: 1,
    max: 10
  },
  retryDelay: {
    type: Number,
    required: true,
    default: 5000, // 5 seconds
    min: 1000,
    max: 60000
  },
  backoffMultiplier: {
    type: Number,
    required: true,
    default: 2,
    min: 1,
    max: 5
  }
}, { _id: false });

const webhookSchema = new Schema<WebhookDocument>(
  {
    id: {
      type: String,
      required: [true, 'Webhook ID is required'],
      default: () => uuidv4(),
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    url: {
      type: String,
      required: [true, 'Webhook URL is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid URL format'
      }
    },
    events: {
      type: [String],
      required: [true, 'At least one event is required'],
      enum: {
        values: Object.values(CancellationEventType),
        message: 'Invalid event type'
      },
      validate: {
        validator: function(v: string[]) {
          return v.length > 0;
        },
        message: 'At least one event must be specified'
      }
    },
    headers: {
      type: Map,
      of: String,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    },
    secret: {
      type: String,
      trim: true,
      minlength: [16, 'Secret must be at least 16 characters long']
    },
    retryConfig: {
      type: retryConfigSchema,
      required: true,
      default: () => ({
        maxRetries: 3,
        retryDelay: 5000,
        backoffMultiplier: 2
      })
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'webhooks',
  }
);

// Indexes
webhookSchema.index({ id: 1 }, { unique: true });
webhookSchema.index({ events: 1 });
webhookSchema.index({ isActive: 1 });
webhookSchema.index({ createdBy: 1 });
webhookSchema.index({ createdAt: 1 });

// JSON transformation
webhookSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export const WebhookModel = mongoose.model<WebhookDocument>('Webhook', webhookSchema); 