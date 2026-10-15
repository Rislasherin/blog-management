export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export type RegisterResponse = User;

export type OtpFlow = "signup" | "reset";

export interface VerifyOtpPayload {
  email: string;
  code: string;
  name: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetOtpPayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  password: string;
  code?: string;
  resetToken?: string;
}
