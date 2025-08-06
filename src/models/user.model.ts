import mongoose, { Document, Schema } from 'mongoose';
import { User, UserRole } from '../types';

export interface UserDocument extends Document {
  name: string;
  email: string;
  role: 'admin' | 'partner' | 'user' | 'system';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    role: {
      type: String,
      enum: ['admin', 'partner', 'user', 'system'],
      default: 'user',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'users',
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Export the model
export const UserModel = mongoose.model<UserDocument>('User', userSchema); 