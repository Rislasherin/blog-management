import type { Request, Response, NextFunction } from "express";
import type { AuthService } from "../../application/services/auth.service.js";
import type { RegisterInput, LoginInput } from "../validators/auth.validator.js";
import logger from "../../../../infrastructure/logger/logger.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (
    req: Request<Record<string, never>, Record<string, unknown>, RegisterInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { name, email, password } = req.body;
      const user = await this.authService.Register(name, email, password);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<Record<string, never>, Record<string, unknown>, LoginInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, password } = req.body;
      const data = await this.authService.Login(email, password);

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
}

export default AuthController;
