import type { AuthenticatedUser } from "../../modules/auth/types/auth.types.js";

declare global {
  namespace Express {
    export interface Request {
      user?: AuthenticatedUser;
    }
  }
}
