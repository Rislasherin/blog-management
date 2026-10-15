import mongoose, { Schema, Document, Model, model } from "mongoose";
import type { IOtp } from "./auth.types.js";

export const otpSchema = new Schema<IOtp & Document>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, required: true, enum: ["signup", "reset", "change"] },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: false,
  }
);

// TTL index to automatically remove expired OTP records
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel: Model<IOtp> =
  mongoose.models.Otp || model<IOtp>("Otp", otpSchema);

export default OtpModel;
