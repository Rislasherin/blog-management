import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(2000),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/blog_db"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long").default("fallback_secret_for_local_development_only_123456"),
  JWT_EXPIRES_IN: z.string().default("3600"),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check your .env file.");
}

export const env = parsed.data;
