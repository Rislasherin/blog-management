import type { IOtpDocument } from "../models/OtpModel.js";
import { Otp, type IOtp } from "../../../domain/entities/Otp.js";

export class OtpMapper {
  static toDomain(raw: IOtpDocument | IOtp): Otp {
    const rawAny = raw as { _id?: unknown; id?: string };
    const id = rawAny._id ? String(rawAny._id) : (rawAny.id ?? "");
    return new Otp({
      id,
      _id: id,
      email: raw.email,
      purpose: raw.purpose,
      codeHash: raw.codeHash,
      expiresAt: raw.expiresAt,
      used: raw.used,
      attempts: raw.attempts,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(otp: Otp | IOtp): Partial<IOtpDocument> {
    return {
      email: otp.email,
      purpose: otp.purpose,
      codeHash: otp.codeHash,
      expiresAt: otp.expiresAt,
      used: otp.used,
      attempts: otp.attempts,
      createdAt: otp.createdAt,
    };
  }
}

export default OtpMapper;
