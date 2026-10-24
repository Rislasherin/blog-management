import { OtpPurpose, type OtpPurposeType } from "../enums/OtpPurpose.enum.js";

export type { OtpPurposeType };

export interface OtpProps {
  id?: string;
  _id?: string;
  email: string;
  purpose: OtpPurpose | OtpPurposeType;
  codeHash: string;
  expiresAt: Date;
  used?: boolean;
  attempts?: number;
  createdAt?: Date;
}

export interface IOtp {
  id: string;
  _id?: string;
  email: string;
  purpose: OtpPurpose | OtpPurposeType;
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
}

/**
 * Domain Entity: Otp
 * Encapsulates one-time password business rules and expiration logic.
 */
export class Otp implements IOtp {
  public readonly id: string;
  public readonly _id?: string;
  public readonly email: string;
  public readonly purpose: OtpPurpose | OtpPurposeType;
  public readonly codeHash: string;
  public readonly expiresAt: Date;
  public used: boolean;
  public attempts: number;
  public readonly createdAt: Date;

  constructor(props: OtpProps) {
    this.id = props.id ?? props._id ?? "";
    this._id = this.id;
    this.email = props.email.toLowerCase().trim();
    this.purpose = props.purpose;
    this.codeHash = props.codeHash;
    this.expiresAt = props.expiresAt;
    this.used = props.used ?? false;
    this.attempts = props.attempts ?? 0;
    this.createdAt = props.createdAt ?? new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.email || !this.email.includes("@")) {
      throw new Error("Invalid email address for OTP");
    }
    if (!this.codeHash) {
      throw new Error("OTP code hash is required");
    }
    const validPurposes: (OtpPurpose | OtpPurposeType)[] = [
      OtpPurpose.SIGNUP,
      OtpPurpose.RESET,
      OtpPurpose.CHANGE,
      "signup",
      "reset",
      "change",
    ];
    if (!validPurposes.includes(this.purpose)) {
      throw new Error(`Invalid OTP purpose: ${this.purpose}`);
    }
  }

  public isExpired(now: Date = new Date()): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }

  public canBeUsed(now: Date = new Date(), maxAttempts: number = 5): boolean {
    return !this.used && !this.isExpired(now) && this.attempts < maxAttempts;
  }

  public isMaxAttemptsExceeded(maxAttempts: number = 5): boolean {
    return this.attempts >= maxAttempts;
  }

  public markUsed(): void {
    this.used = true;
  }

  public incrementAttempts(): void {
    this.attempts += 1;
  }

  public toPlain(): IOtp {
    return {
      id: this.id,
      _id: this.id,
      email: this.email,
      purpose: this.purpose,
      codeHash: this.codeHash,
      expiresAt: this.expiresAt,
      used: this.used,
      attempts: this.attempts,
      createdAt: this.createdAt,
    };
  }
}

export default Otp;
