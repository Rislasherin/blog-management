export interface RegisterUserDTO {
  name: string;
  email: string;
  password?: string | undefined;
}

export type RegisterDTO = RegisterUserDTO;

export interface RegisterUserResponseDTO {
  success: boolean;
  message: string;
}

export interface VerifyOtpDTO {
  email: string;
  otp?: string | undefined;
  code?: string | undefined;
  name?: string | undefined;
  password?: string | undefined;
}

export interface ResendOtpDTO {
  email: string;
}

export interface LoginDTO {
  email: string;
  password?: string | undefined;
}

export type LoginInputDTO = LoginDTO;

export interface RequestPasswordResetDTO {
  email: string;
}

export type ForgotPasswordDTO = RequestPasswordResetDTO;

export interface VerifyResetOtpDTO {
  email: string;
  otp?: string | undefined;
  code?: string | undefined;
}

export interface RequestPasswordResetResponseDTO {
  success: boolean;
  message: string;
}

export interface VerifyResetOtpResponseDTO {
  success: boolean;
  message: string;
  resetToken: string;
}

export interface ResetPasswordResponseDTO {
  success: boolean;
  message: string;
}

export interface ResetPasswordDTO {
  token?: string | undefined;
  resetToken?: string | undefined;
  email?: string | undefined;
  code?: string | undefined;
  newPassword?: string | undefined;
  password?: string | undefined;
}

export interface AuthResponseDTO {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
