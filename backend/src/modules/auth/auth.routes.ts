import { Router } from "express";
import AuthController from "./auth.controller.js";
import AuthService from "./auth.service.js";
import MongoUserRepository from "./repositories/mongo-user.repository.js";
import JwtTokenService from "./services/jwt.service.js";
import validate from "../../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "./auth.validator.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

import { authRateLimiter } from "../../middleware/rateLimiter.middleware.js";

const authRouter = Router();

const userRepository = new MongoUserRepository();
const tokenService = new JwtTokenService();
const authService = new AuthService(userRepository, tokenService);
const authController = new AuthController(authService);

authRouter.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

authRouter.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

export default authRouter;
