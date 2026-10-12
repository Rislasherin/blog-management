import { createPostModule } from "./posts.module.js";
import JwtTokenService from "../auth/services/jwt.service.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const tokenService = new JwtTokenService();
const requireAuth = authMiddleware(tokenService);

const postModule = createPostModule({ requireAuth });
export const postRouter = postModule.postRouter;

export default postRouter;
