import type { IOtp, OtpPurpose } from '../entities/otp.entity.js';

export interface IOtpRepository {
  create(data: {
    email: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    attempts?: number;
  }): Promise<IOtp>;

  findValid(email: string, purpose: OtpPurpose): Promise<IOtp | null>;

  markAsUsed(id: string): Promise<IOtp | null>;

  incrementAttempts(id: string): Promise<IOtp | null>;

  deleteMany(filter: Record<string, unknown>): Promise<number>;
}
