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

export interface VerifyOtpPayload {
  email: string;
  code: string;
  name: string;
  password: string;
}
