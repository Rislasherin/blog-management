import { OtpModel } from '../models/otp.model.js';
import type { IOtp, OtpPurpose } from '../../../domain/entities/otp.entity.js';
import type { IOtpRepository } from '../../../domain/repositories/otp.repository.interface.js';
import { Types } from 'mongoose';

export class MongoOtpRepository implements IOtpRepository {
  async create(data: {
    email: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    attempts?: number;
  }): Promise<IOtp> {
    const { email, purpose, codeHash, expiresAt, attempts = 0 } = data;
    return OtpModel.create({
      email,
      purpose,
      codeHash,
      expiresAt,
      attempts,
      used: false,
      createdAt: new Date(),
    });
  }

  async findValid(email: string, purpose: OtpPurpose): Promise<IOtp | null> {
    const now = new Date();
    return OtpModel.findOne({
      email,
      purpose,
      used: false,
      expiresAt: { $gt: now },
    }).exec();
  }

  async markAsUsed(id: string): Promise<IOtp | null> {
    // Ensure we only update if not already used
    return OtpModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), used: false },
      { $set: { used: true } },
      { new: true },
    ).exec();
  }

  async incrementAttempts(id: string): Promise<IOtp | null> {
    return OtpModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $inc: { attempts: 1 } },
      { new: true },
    ).exec();
  }

  async deleteMany(filter: Record<string, unknown>): Promise<number> {
    const result = await OtpModel.deleteMany(filter).exec();
    return result.deletedCount ?? 0;
  }
}
