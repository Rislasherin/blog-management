import { Types } from "mongoose";
import { OtpModel } from "../models/OtpModel.js";
import { OtpMapper } from "../mappers/OtpMapper.js";
import type { Otp, OtpPurposeType } from "../../../domain/entities/Otp.js";
import type { OtpPurpose } from "../../../domain/enums/OtpPurpose.enum.js";
import type { IOtpRepository } from "../../../domain/repositories/IOtpRepository.js";

export class MongoOtpRepository implements IOtpRepository {
  async create(data: {
    email: string;
    purpose: OtpPurpose | OtpPurposeType;
    codeHash: string;
    expiresAt: Date;
    attempts?: number;
  }): Promise<Otp> {
    const { email, purpose, codeHash, expiresAt, attempts = 0 } = data;
    const doc = await OtpModel.create({
      email,
      purpose,
      codeHash,
      expiresAt,
      attempts,
      used: false,
      createdAt: new Date(),
    });
    return OtpMapper.toDomain(doc);
  }

  async findValid(email: string, purpose: OtpPurpose | OtpPurposeType): Promise<Otp | null> {
    const now = new Date();
    const doc = await OtpModel.findOne({
      email,
      purpose,
      used: false,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .exec();
    return doc ? OtpMapper.toDomain(doc) : null;
  }

  async markAsUsed(id: string): Promise<Otp | null> {
    const queryId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
    const doc = await OtpModel.findOneAndUpdate(
      { _id: queryId, used: false },
      { $set: { used: true } },
      { new: true }
    ).exec();
    return doc ? OtpMapper.toDomain(doc) : null;
  }

  async incrementAttempts(id: string): Promise<Otp | null> {
    const queryId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
    const doc = await OtpModel.findByIdAndUpdate(
      queryId,
      { $inc: { attempts: 1 } },
      { new: true }
    ).exec();
    return doc ? OtpMapper.toDomain(doc) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const queryId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
    const result = await OtpModel.findByIdAndDelete(queryId).exec();
    return result !== null;
  }

  async deleteMany(filter: Record<string, unknown>): Promise<number> {
    const result = await OtpModel.deleteMany(filter).exec();
    return result.deletedCount ?? 0;
  }
}

export default MongoOtpRepository;
