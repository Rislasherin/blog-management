import type {
  RegisterUserDTO,
  RegisterUserResponseDTO,
  VerifyOtpDTO,
  LoginDTO,
  RequestPasswordResetDTO,
  RequestPasswordResetResponseDTO,
  VerifyResetOtpResponseDTO,
  ResetPasswordDTO,
  ResetPasswordResponseDTO,
} from "../dtos/auth.dto.js";

import type { VerifyOtpResponseDTO } from "../use-cases/auth/interfaces/IVerifyOtpUseCase.js";
import type { LoginResponseDTO } from "../use-cases/auth/interfaces/ILoginUseCase.js";

export interface IAuthService {
  initiateSignup(name: string, email: string, password?: string): Promise<RegisterUserResponseDTO>;
  verifySignupOtp(email: string, code: string, name: string, password?: string): Promise<VerifyOtpResponseDTO>;
  register(dto: RegisterUserDTO): Promise<RegisterUserResponseDTO>;
  verifyOtp(dto: VerifyOtpDTO): Promise<VerifyOtpResponseDTO>;
  login(email: string, password?: string): Promise<LoginResponseDTO>;
  loginDto?(dto: LoginDTO): Promise<LoginResponseDTO>;
  forgotPassword(email: string): Promise<RequestPasswordResetResponseDTO>;
  verifyResetOtp(email: string, code: string): Promise<VerifyResetOtpResponseDTO>;
  resetPassword(dto: ResetPasswordDTO): Promise<ResetPasswordResponseDTO>;
}

export default IAuthService;
