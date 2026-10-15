import type { Router, RequestHandler } from "express";
import { MongoUserRepository } from "./user.repository.js";
import { MongoOtpRepository } from "./otp.repository.js";
import { JwtTokenService } from "./jwt.service.js";
import { EmailService } from "./email.service.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { createAuthRouter } from "./auth.routes.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.middleware.js";
import type { IUserRepository, ITokenService, IOtpRepository } from "./auth.types.js";

export interface AuthModuleDependencies {
  userRepository?: IUserRepository;
  tokenService?: ITokenService;
  otpRepository?: IOtpRepository;
  emailService?: EmailService;
}

export interface AuthModule {
  router: Router;
  authMiddleware: RequestHandler;
  authService: AuthService;
  tokenService: ITokenService;
  userRepository: IUserRepository;
  otpRepository: IOtpRepository;
}

export const createAuthModule = (deps?: AuthModuleDependencies): AuthModule => {
  const userRepository = deps?.userRepository ?? new MongoUserRepository();
  const tokenService = deps?.tokenService ?? new JwtTokenService();
  const otpRepository = deps?.otpRepository ?? new MongoOtpRepository();
  const emailService = deps?.emailService ?? new EmailService();

  const authService = new AuthService(userRepository, tokenService, otpRepository, emailService);
  const authController = new AuthController(authService);
  const router = createAuthRouter(authController);
  const authMiddleware = createAuthMiddleware(tokenService);

  return {
    router,
    authMiddleware,
    authService,
    tokenService,
    userRepository,
    otpRepository,
  };
};

export default createAuthModule;
