import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../domain/repositories/IOtpRepository.js";
import type { ITokenService } from "../interfaces/ITokenService.js";
import type { IEmailService } from "../interfaces/IEmailService.js";
import type { IPasswordHasher } from "../interfaces/IPasswordHasher.js";

import { RegisterUserUseCase } from "../use-cases/auth/implementations/RegisterUserUseCase.js";
import type { IRegisterUserUseCase } from "../use-cases/auth/interfaces/IRegisterUserUseCase.js";
import { VerifyOtpUseCase } from "../use-cases/auth/implementations/VerifyOtpUseCase.js";
import type { IVerifyOtpUseCase, VerifyOtpResponseDTO } from "../use-cases/auth/interfaces/IVerifyOtpUseCase.js";
import { LoginUseCase } from "../use-cases/auth/implementations/LoginUseCase.js";
import type { ILoginUseCase, LoginResponseDTO } from "../use-cases/auth/interfaces/ILoginUseCase.js";
import { RequestPasswordResetUseCase } from "../use-cases/auth/implementations/RequestPasswordResetUseCase.js";
import type { IRequestPasswordResetUseCase, RequestPasswordResetResponseDTO } from "../use-cases/auth/interfaces/IRequestPasswordResetUseCase.js";
import { VerifyResetOtpUseCase } from "../use-cases/auth/implementations/VerifyResetOtpUseCase.js";
import type { IVerifyResetOtpUseCase, VerifyResetOtpResponseDTO } from "../use-cases/auth/interfaces/IVerifyResetOtpUseCase.js";
import { ResetPasswordUseCase } from "../use-cases/auth/implementations/ResetPasswordUseCase.js";
import type { IResetPasswordUseCase, ResetPasswordResponseDTO } from "../use-cases/auth/interfaces/IResetPasswordUseCase.js";

import type { RegisterUserDTO, RegisterUserResponseDTO, VerifyOtpDTO, LoginDTO, ResetPasswordDTO } from "../dtos/auth.dto.js";
import type { IAuthService } from "./IAuthService.js";

export class AuthService implements IAuthService {
  public readonly registerUserUseCase: IRegisterUserUseCase;
  public readonly verifyOtpUseCase: IVerifyOtpUseCase;
  public readonly loginUseCase: ILoginUseCase;
  public readonly requestPasswordResetUseCase: IRequestPasswordResetUseCase;
  public readonly verifyResetOtpUseCase: IVerifyResetOtpUseCase;
  public readonly resetPasswordUseCase: IResetPasswordUseCase;

  constructor(
    userRepositoryOrRegisterUseCase: IUserRepository | IRegisterUserUseCase,
    tokenServiceOrVerifyOtpUseCase: ITokenService | IVerifyOtpUseCase,
    otpRepositoryOrLoginUseCase: IOtpRepository | ILoginUseCase,
    emailServiceOrRequestResetUseCase: IEmailService | IRequestPasswordResetUseCase,
    verifyResetOtpUseCase?: IVerifyResetOtpUseCase,
    resetPasswordUseCase?: IResetPasswordUseCase,
    passwordHasher?: IPasswordHasher
  ) {
    if (
      verifyResetOtpUseCase &&
      resetPasswordUseCase &&
      "execute" in userRepositoryOrRegisterUseCase
    ) {
      this.registerUserUseCase = userRepositoryOrRegisterUseCase as IRegisterUserUseCase;
      this.verifyOtpUseCase = tokenServiceOrVerifyOtpUseCase as IVerifyOtpUseCase;
      this.loginUseCase = otpRepositoryOrLoginUseCase as ILoginUseCase;
      this.requestPasswordResetUseCase = emailServiceOrRequestResetUseCase as IRequestPasswordResetUseCase;
      this.verifyResetOtpUseCase = verifyResetOtpUseCase;
      this.resetPasswordUseCase = resetPasswordUseCase;
    } else {
      const userRepo = userRepositoryOrRegisterUseCase as IUserRepository;
      const tokenService = tokenServiceOrVerifyOtpUseCase as ITokenService;
      const otpRepo = otpRepositoryOrLoginUseCase as IOtpRepository;
      const emailService = emailServiceOrRequestResetUseCase as IEmailService;
      const hasher = passwordHasher as IPasswordHasher;

      this.registerUserUseCase = new RegisterUserUseCase(userRepo, otpRepo, emailService, hasher);
      this.verifyOtpUseCase = new VerifyOtpUseCase(userRepo, otpRepo, hasher);
      this.loginUseCase = new LoginUseCase(userRepo, tokenService, hasher);
      this.requestPasswordResetUseCase = new RequestPasswordResetUseCase(userRepo, otpRepo, emailService, hasher);
      this.verifyResetOtpUseCase = new VerifyResetOtpUseCase(otpRepo, tokenService, hasher);
      this.resetPasswordUseCase = new ResetPasswordUseCase(userRepo, otpRepo, tokenService, hasher);
    }
  }

  async initiateSignup(name: string, email: string, password?: string): Promise<RegisterUserResponseDTO> {
    const payload: RegisterUserDTO = { name, email };
    if (password !== undefined) payload.password = password;
    return this.registerUserUseCase.execute(payload);
  }

  async verifySignupOtp(email: string, code: string, name: string, password?: string): Promise<VerifyOtpResponseDTO> {
    const payload: VerifyOtpDTO = { email, otp: code, name };
    if (password !== undefined) payload.password = password;
    return this.verifyOtpUseCase.execute(payload);
  }

  async register(dto: RegisterUserDTO): Promise<RegisterUserResponseDTO> {
    return this.registerUserUseCase.execute(dto);
  }

  async verifyOtp(dto: VerifyOtpDTO): Promise<VerifyOtpResponseDTO> {
    return this.verifyOtpUseCase.execute(dto);
  }

  async login(email: string, password?: string): Promise<LoginResponseDTO> {
    const payload: LoginDTO = { email };
    if (password !== undefined) payload.password = password;
    return this.loginUseCase.execute(payload);
  }

  async loginDto(dto: LoginDTO): Promise<LoginResponseDTO> {
    return this.loginUseCase.execute(dto);
  }

  async forgotPassword(email: string): Promise<RequestPasswordResetResponseDTO> {
    return this.requestPasswordResetUseCase.execute(email);
  }

  async verifyResetOtp(email: string, code: string): Promise<VerifyResetOtpResponseDTO> {
    return this.verifyResetOtpUseCase.execute(email, code);
  }

  async resetPassword(dto: ResetPasswordDTO): Promise<ResetPasswordResponseDTO> {
    return this.resetPasswordUseCase.execute(dto);
  }
}

export default AuthService;
