import type { Request, Response, NextFunction } from "express";
import type { ITokenService } from "../modules/auth/interfaces/token.service.interface.js";
import AppError from "../utils/appError.js";

export const authMiddleware = (tokenService: ITokenService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError(401, "Authentication required");
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        throw new AppError(401, "Authentication required");
      }

      const token = parts[1];
      if (!token) {
        throw new AppError(401, "Authentication required");
      }

      const payload = tokenService.verifyAccessToken(token);

      req.user = {
        id: payload.sub,
        email: payload.email,
      };

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(401, "Authentication required"));
      }
    }
  };
};
