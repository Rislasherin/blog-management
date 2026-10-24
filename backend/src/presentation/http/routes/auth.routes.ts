import { Router } from "express";
import type { AuthController } from "../controllers/AuthController.js";
import { validate } from "../middleware/validate.middleware.js";
import { authRateLimiter } from "../middleware/rateLimiter.middleware.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "../validators/auth.validator.js";

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

  router.post(
    "/forgot-password",
    authRateLimiter,
    validate(forgotPasswordSchema),
    authController.forgotPassword
  );

  router.post(
    "/verify-reset-otp",
    authRateLimiter,
    validate(verifyResetOtpSchema),
    authController.verifyResetOtp
  );

  router.post(
    "/reset-password",
    authRateLimiter,
    validate(resetPasswordSchema),
    authController.resetPassword
  );

  return router;
};

export default createAuthRouter;
