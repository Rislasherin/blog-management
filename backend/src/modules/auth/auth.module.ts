import type { Router, RequestHandler } from "express";
import { MongoUserRepository } from "./infrastructure/persistence/repositories/mongo-user.repository.js";
import { JwtTokenService } from "./infrastructure/security/jwt.service.js";
import { AuthService } from "./application/services/auth.service.js";
import { AuthController } from "./presentation/controllers/auth.controller.js";
import { createAuthRouter } from "./presentation/routes/auth.routes.js";
import { createAuthMiddleware } from "./presentation/middleware/auth.middleware.js";
import type { IUserRepository } from "./domain/repositories/user.repository.interface.js";
import type { ITokenService } from "./domain/services/token.service.interface.js";

export interface AuthModuleDependencies {
  userRepository?: IUserRepository;
  tokenService?: ITokenService;
}

export interface AuthModule {
  router: Router;
  authMiddleware: RequestHandler;
  authService: AuthService;
  tokenService: ITokenService;
  userRepository: IUserRepository;
}

export const createAuthModule = (deps?: AuthModuleDependencies): AuthModule => {
  const userRepository = deps?.userRepository ?? new MongoUserRepository();
  const tokenService = deps?.tokenService ?? new JwtTokenService();
  const authService = new AuthService(userRepository, tokenService);
  const authController = new AuthController(authService);
  const router = createAuthRouter(authController);
  const authMiddleware = createAuthMiddleware(tokenService);

  return {
    router,
    authMiddleware,
    authService,
    tokenService,
    userRepository,
  };
};
