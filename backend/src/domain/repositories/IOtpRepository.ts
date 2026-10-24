import type { IOtp, Otp, OtpPurposeType } from "../entities/Otp.js";
import type { OtpPurpose } from "../enums/OtpPurpose.enum.js";

export interface IOtpRepository {
  create(data: {
    email: string;
    purpose: OtpPurpose | OtpPurposeType;
    codeHash: string;
    expiresAt: Date;
    attempts?: number;
  }): Promise<IOtp | Otp>;

  findValid(email: string, purpose: OtpPurpose | OtpPurposeType): Promise<IOtp | Otp | null>;

  markAsUsed(id: string): Promise<IOtp | Otp | null>;

  incrementAttempts(id: string): Promise<IOtp | Otp | null>;

  deleteById(id: string): Promise<boolean>;

  deleteMany(filter: Record<string, unknown>): Promise<number>;
}

export default IOtpRepository;
