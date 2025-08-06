import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CancellationEventType, WebhookDeliveryStatus } from '../types/webhook.types';

export interface WebhookEventDocument extends Document {
  id: string;
  webhookId: string;
  eventType: CancellationEventType;
  payload: any;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventDocument>(
  {
    id: {
      type: String,
      required: [true, 'Webhook event ID is required'],
      default: () => uuidv4(),
      trim: true,
    },
    webhookId: {
      type: String,
      required: [true, 'Webhook ID is required'],
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: Object.values(CancellationEventType),
        message: 'Invalid event type'
      }
    },
    payload: {
      type: Schema.Types.Mixed,
      required: [true, 'Event payload is required']
    },
    status: {
      type: String,
      required: [true, 'Delivery status is required'],
      enum: {
        values: Object.values(WebhookDeliveryStatus),
        message: 'Invalid delivery status'
      },
      default: WebhookDeliveryStatus.PENDING
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lastAttemptAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    errorMessage: {
      type: String,
      trim: true
    },
    correlationId: {
      type: String,
      required: [true, 'Correlation ID is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'webhook_events',
  }
);

// Indexes
webhookEventSchema.index({ id: 1 }, { unique: true });
webhookEventSchema.index({ webhookId: 1 });
webhookEventSchema.index({ eventType: 1 });
webhookEventSchema.index({ status: 1 });
webhookEventSchema.index({ correlationId: 1 });
webhookEventSchema.index({ createdAt: 1 });
webhookEventSchema.index({ lastAttemptAt: 1 });

// JSON transformation
webhookEventSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export const WebhookEventModel = mongoose.model<WebhookEventDocument>('WebhookEvent', webhookEventSchema); 