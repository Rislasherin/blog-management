import { Schema, model, type Document } from "mongoose";
import { OtpPurpose } from "../../../domain/enums/OtpPurpose.enum.js";

export interface IOtpDocument extends Document {
  email: string;
  purpose: "signup" | "reset" | "change";
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
}

const otpSchema = new Schema<IOtpDocument>(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [OtpPurpose.SIGNUP, OtpPurpose.RESET, OtpPurpose.CHANGE, "signup", "reset", "change"],
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1, used: 1, expiresAt: 1 });

export const OtpModel = model<IOtpDocument>("Otp", otpSchema);
export default OtpModel;
