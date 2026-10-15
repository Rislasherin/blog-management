import { Router } from "express";
import type { AuthController } from "./auth.controller.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { authRateLimiter } from "../../shared/middleware/rateLimiter.middleware.js";
import { registerSchema, loginSchema, verifyOtpSchema } from "./auth.validator.js";

export const createAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  router.post(
    "/register",
    authRateLimiter,
    validate(registerSchema),
    authController.register
  );

  router.post(
    "/verify-otp",
    authRateLimiter,
    validate(verifyOtpSchema),
    authController.verifyOtp
  );

  router.post(
    "/login",
    authRateLimiter,
    validate(loginSchema),
    authController.login
  );

  return router;
};

export default createAuthRouter;
