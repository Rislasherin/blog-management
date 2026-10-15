import { Schema, Document, Types } from 'mongoose';
import type { IOtp } from '../../domain/entities/otp.entity.js';

export const otpSchema = new Schema<IOtp & Document>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, required: true, enum: ['signup', 'reset', 'change'] },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    // TTL index to auto‑remove expired OTPs
    timestamps: false,
  },
);

// TTL index on expiresAt (Mongo will delete when expiresAt < now)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default otpSchema;
