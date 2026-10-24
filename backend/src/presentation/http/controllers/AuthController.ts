import type { Request, Response, NextFunction } from "express";
import type { IAuthService } from "../../../application/services/IAuthService.js";
import type { IRegisterUserUseCase } from "../../../application/use-cases/auth/interfaces/IRegisterUserUseCase.js";
import type { ILoginUseCase } from "../../../application/use-cases/auth/interfaces/ILoginUseCase.js";
import type { IVerifyOtpUseCase } from "../../../application/use-cases/auth/interfaces/IVerifyOtpUseCase.js";
import type { IRequestPasswordResetUseCase } from "../../../application/use-cases/auth/interfaces/IRequestPasswordResetUseCase.js";
import type { IVerifyResetOtpUseCase } from "../../../application/use-cases/auth/interfaces/IVerifyResetOtpUseCase.js";
import type { IResetPasswordUseCase } from "../../../application/use-cases/auth/interfaces/IResetPasswordUseCase.js";
import type { ILogger } from "../../../application/interfaces/ILogger.js";
import type { ResetPasswordDTO } from "../../../application/dtos/auth.dto.js";
import { HttpStatus } from "../../../domain/enums/HttpStatus.enum.js";
import type {
  RegisterInput,
  LoginInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  VerifyResetOtpInput,
  ResetPasswordInput,
} from "../validators/auth.validator.js";

const noopLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

export interface AuthControllerDependencies {
  registerUserUseCase: IRegisterUserUseCase;
  loginUseCase: ILoginUseCase;
  verifyOtpUseCase: IVerifyOtpUseCase;
  requestPasswordResetUseCase: IRequestPasswordResetUseCase;
  verifyResetOtpUseCase: IVerifyResetOtpUseCase;
  resetPasswordUseCase: IResetPasswordUseCase;
  logger?: ILogger;
}

export class AuthController {
  private readonly registerUserUseCase: IRegisterUserUseCase;
  private readonly loginUseCase: ILoginUseCase;
  private readonly verifyOtpUseCase: IVerifyOtpUseCase;
  private readonly requestPasswordResetUseCase: IRequestPasswordResetUseCase;
  private readonly verifyResetOtpUseCase: IVerifyResetOtpUseCase;
  private readonly resetPasswordUseCase: IResetPasswordUseCase;
  private readonly logger: ILogger;

  constructor(
    depsOrService: AuthControllerDependencies | IAuthService,
    logger?: ILogger
  ) {
    if ("registerUserUseCase" in depsOrService) {
      this.registerUserUseCase = depsOrService.registerUserUseCase;
      this.loginUseCase = depsOrService.loginUseCase;
      this.verifyOtpUseCase = depsOrService.verifyOtpUseCase;
      this.requestPasswordResetUseCase = depsOrService.requestPasswordResetUseCase;
      this.verifyResetOtpUseCase = depsOrService.verifyResetOtpUseCase;
      this.resetPasswordUseCase = depsOrService.resetPasswordUseCase;
      this.logger = depsOrService.logger ?? logger ?? noopLogger;
    } else {
      const service = depsOrService;
      this.registerUserUseCase = { execute: (dto) => service.register(dto) };
      this.loginUseCase = {
        execute: (dto) =>
          service.loginDto ? service.loginDto(dto) : service.login(dto.email, dto.password),
      };
      this.verifyOtpUseCase = { execute: (dto) => service.verifyOtp(dto) };
      this.requestPasswordResetUseCase = {
        execute: (emailOrDto) =>
          typeof emailOrDto === "string"
            ? service.forgotPassword(emailOrDto)
            : service.forgotPassword(emailOrDto.email),
      };
      this.verifyResetOtpUseCase = {
        execute: (emailOrDto, codeParam) =>
          typeof emailOrDto === "string"
            ? service.verifyResetOtp(emailOrDto, codeParam || "")
            : service.verifyResetOtp(emailOrDto.email, (emailOrDto as { code?: string }).code || ""),
      };
      this.resetPasswordUseCase = { execute: (dto) => service.resetPassword(dto) };
      this.logger = logger ?? noopLogger;
    }
  }

  register = async (
    req: Request<Record<string, never>, unknown, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.registerUserUseCase.execute(req.body);
      res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<Record<string, never>, unknown, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const data = await this.loginUseCase.execute({ email, password });
      this.logger.info(`Login successful for user: ${email}`);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Login successful",
        data,
      });
    } catch (error) {
      this.logger.error(`Login failed for user: ${req.body.email}`);
      next(error);
    }
  };

  verifyOtp = async (
    req: Request<Record<string, never>, unknown, VerifyOtpInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.verifyOtpUseCase.execute(req.body);
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Account verified and created",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (
    req: Request<Record<string, never>, unknown, ForgotPasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.requestPasswordResetUseCase.execute(req.body.email);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyResetOtp = async (
    req: Request<Record<string, never>, unknown, VerifyResetOtpInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.verifyResetOtpUseCase.execute(req.body.email, req.body.code);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (
    req: Request<Record<string, never>, unknown, ResetPasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload: ResetPasswordDTO & { email?: string | undefined; code?: string | undefined; resetToken?: string | undefined } = {
        email: req.body.email,
        password: req.body.password,
      };
      if (req.body.code !== undefined) payload.code = req.body.code;
      if (req.body.resetToken !== undefined) {
        payload.token = req.body.resetToken;
        payload.resetToken = req.body.resetToken;
      }
      const result = await this.resetPasswordUseCase.execute(payload);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
