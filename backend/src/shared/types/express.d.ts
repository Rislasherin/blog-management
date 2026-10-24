import type { AuthenticatedUser } from "../../domain/entities/User.js";

declare global {
  namespace Express {
    export interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
