import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../types';
import bcrypt from 'bcryptjs';

export interface UserDocument extends Document {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'partner' | 'user' | 'system';
  isActive: boolean;
  dateOfBirth?: Date;
  nationality?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  age?: number;
}

// User schema
const userSchema = new Schema<UserDocument>(
  {
    id: {
      type: String,
      required: [true, 'User ID is required'],
      default: () => uuidv4(),
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password in queries by default
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
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(this: UserDocument, value: Date) {
          // Only validate if role is not 'system'
          if (this.role === 'system') return true;
          
          if (!value) return true; // Optional field
          
          // Check if date is in the past
          if (value >= new Date()) {
            return false;
          }
          
          // Check if date is not too far in the past (e.g., not older than 150 years)
          const minDate = new Date();
          minDate.setFullYear(minDate.getFullYear() - 150);
          if (value < minDate) {
            return false;
          }
          
          return true;
        },
        message: 'Date of birth must be a valid past date and not older than 150 years'
      }
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [100, 'Nationality cannot exceed 100 characters'],
      validate: {
        validator: function(this: UserDocument, value: string) {
          // Only validate if role is not 'system'
          if (this.role === 'system') return true;
          
          if (!value) return true; // Optional field
          
          // Basic validation - should contain only letters, spaces, and common punctuation
          const nationalityRegex = /^[a-zA-Z\s\-'()]+$/;
          return nationalityRegex.test(value);
        },
        message: 'Nationality should contain only letters, spaces, hyphens, apostrophes, and parentheses'
      }
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'users',
  }
);

// Indexes
userSchema.index({ id: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ dateOfBirth: 1 });
userSchema.index({ nationality: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with salt rounds of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name}`;
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret.__v;
    delete ret.password; // Never include password in JSON
    return ret;
  },
});

// Export the model
export const UserModel = mongoose.model<UserDocument>('User', userSchema); 