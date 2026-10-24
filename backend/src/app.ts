import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";

import { env } from "./infrastructure/config/env.js";
import { globalRateLimiter } from "./presentation/http/middleware/rateLimiter.middleware.js";
import { errorMiddleware } from "./presentation/http/middleware/error.middleware.js";
import { defaultContainer, type Container } from "./infrastructure/di/container.js";

/**
 * Creates and configures the Express HTTP Application.
 * Injects pre-wired routers and middlewares from the Composition Root.
 */
export const createApp = (container: Container = defaultContainer): Express => {
  const app = express();

  // Trust reverse proxy (Vercel, Render, Railway, AWS ALB, Nginx, etc.)
  app.set("trust proxy", 1);

  app.use(helmet());

  const clientUrls = env.CLIENT_URL.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  const allowedOrigins = [
    ...clientUrls,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter((origin): origin is string => Boolean(origin));

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        env.NODE_ENV === "development" ||
        env.NODE_ENV === "test"
      ) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy does not allow access from this origin."),
      );
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  // Global API rate limiting
  app.use(globalRateLimiter);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Blog Management API is running",
      environment: env.NODE_ENV,
      uptime: process.uptime(),
    });
  });

  // Mount feature routers wired by Composition Root
  app.use("/api/auth", container.authRouter);
  app.use("/api/posts", container.postRouter);

  // Handle unknown routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  // Global error handling
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
export default app;
