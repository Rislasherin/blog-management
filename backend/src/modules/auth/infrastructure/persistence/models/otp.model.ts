import mongoose, { Model, model } from 'mongoose';
import { otpSchema } from '../schemas/otp.schema.js';
import type { IOtp } from '../../../domain/entities/otp.entity.js';

export const OtpModel: Model<IOtp> =
  mongoose.models.Otp || model<IOtp>('Otp', otpSchema);

export default OtpModel;
