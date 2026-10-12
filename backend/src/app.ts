import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { globalRateLimiter } from "./shared/middleware/rateLimiter.middleware.js";
import { createAuthModule } from "./modules/auth/auth.module.js";
import { createPostModule } from "./modules/posts/posts.module.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";

const app = express();

app.use(helmet());

const allowedOrigins = [
  env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      // or if origin is in allowed list, or in development mode
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === "development" || env.NODE_ENV === "test") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy does not allow access from this origin."));
    },
    credentials: true,
  })
);

app.use(express.json());

// Global API Rate Limiting
app.use(globalRateLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Blog Management API is running",
    environment: env.NODE_ENV,
    uptime: process.uptime(),
  });
});

const authModule = createAuthModule();
const postModule = createPostModule({ authMiddleware: authModule.authMiddleware });

app.use("/api/auth", authModule.router);
app.use("/api/posts", postModule.router);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorMiddleware);

export default app;