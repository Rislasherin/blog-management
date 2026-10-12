import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ITokenService } from "../../domain/services/token.service.interface.js";
import { AppError } from "../../../../shared/errors/AppError.js";

export const createAuthMiddleware = (tokenService: ITokenService): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
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

export const authMiddleware = createAuthMiddleware;
export default createAuthMiddleware;
