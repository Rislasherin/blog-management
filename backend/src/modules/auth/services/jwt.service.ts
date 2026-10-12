import jwt from "jsonwebtoken";
import type { ITokenService, AuthTokenPayload } from "../interfaces/token.service.interface.js";
import AppError from "../../../utils/appError.js";

class JwtTokenService implements ITokenService {
  generateAccessToken(payload: AuthTokenPayload): string {
    const secret = process.env.JWT_SECRET;
    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN || "3600", 10);

    if (!secret) {
      throw new AppError(500, "JWT_SECRET is not configured");
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError(500, "JWT_SECRET is not configured");
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
          email: (decoded as Record<string, unknown>).email as string
        };
      }
      
      throw new AppError(401, "Authentication required");
    } catch (error) {
      throw new AppError(401, "Authentication required");
    }
  }
}

export default JwtTokenService;
