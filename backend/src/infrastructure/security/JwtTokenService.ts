import jwt from "jsonwebtoken";
import type { ITokenService, AuthTokenPayload } from "../../application/interfaces/ITokenService.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import { env } from "../config/env.js";

export class JwtTokenService implements ITokenService {
  generateAccessToken(payload: AuthTokenPayload): string {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET;
    const expiresIn = parseInt(
      process.env.JWT_EXPIRES_IN || env.JWT_EXPIRES_IN || "3600",
      10
    );

    if (!secret) {
      throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "JWT_SECRET is not configured");
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET;
    if (!secret) {
      throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "JWT_SECRET is not configured");
    }

    try {
      const decoded = jwt.verify(token, secret);

      if (
        decoded &&
        typeof decoded === "object" &&
        "sub" in decoded &&
        "email" in decoded &&
        typeof (decoded as Record<string, unknown>).sub === "string" &&
        typeof (decoded as Record<string, unknown>).email === "string"
      ) {
        return {
          sub: (decoded as Record<string, unknown>).sub as string,
          email: (decoded as Record<string, unknown>).email as string,
        };
      }

      throw new AppError(HttpStatus.UNAUTHORIZED, "Authentication required");
    } catch {
      throw new AppError(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
  }
}

export default JwtTokenService;
