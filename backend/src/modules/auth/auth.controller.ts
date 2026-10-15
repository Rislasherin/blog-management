import type { Request, Response, NextFunction } from "express";
import type { IAuthService } from "./auth.types.js";
import type { RegisterInput, LoginInput, VerifyOtpInput } from "./auth.validator.js";
import logger from "../../logger/logger.js";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  register = async (
    req: Request<{}, {}, RegisterInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, password } = req.body;
      const data = await this.authService.login(email, password);
      logger.info(`Login successful for user: ${email}`);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data,
      });
    } catch (error) {
      logger.error(`Login failed for user: ${req.body.email}`);
      next(error);
    }
  };

  verifyOtp = async (
    req: Request<{}, {}, VerifyOtpInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.authService.verifyOtp(req.body);
      res.status(200).json({
        success: true,
        message: "Account verified and created",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
