import type { Types } from "mongoose";

export type OtpPurpose = "signup" | "reset" | "change";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface IUser {
  _id?: Types.ObjectId | string;
  name: string;
  email: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOtp {
  _id?: Types.ObjectId;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface VerifyOtpDTO {
  email: string;
  code: string;
  name: string;
  password: string;
}

export interface LoginResponseDTO {
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  create(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUser>;
}

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

export interface ITokenService {
  generateAccessToken(payload: AuthTokenPayload): string;
  verifyAccessToken(token: string): AuthTokenPayload;
}

export interface IAuthService {
  initiateSignup(name: string, email: string, password: string): Promise<{ success: boolean; message: string }>;
  verifySignupOtp(email: string, code: string, name: string, password: string): Promise<{ id?: string | undefined; name: string; email: string }>;
  register(dto: RegisterDTO): Promise<{ success: boolean; message: string }>;
  verifyOtp(dto: VerifyOtpDTO): Promise<{ id?: string | undefined; name: string; email: string }>;
  login(email: string, password: string): Promise<LoginResponseDTO>;
  loginDto(dto: LoginDTO): Promise<LoginResponseDTO>;
}
