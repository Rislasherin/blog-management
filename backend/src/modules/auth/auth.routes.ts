import { createAuthModule } from "./auth.module.js";

const authModule = createAuthModule();
export const authRouter = authModule.router;
export default authRouter;
