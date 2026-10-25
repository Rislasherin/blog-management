import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Ensure .env is loaded from process.cwd() and backend root directory
dotenv.config();

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(currentDir, "../../../.env");
// override: false ensures real hosting environment variables take precedence over local .env files
dotenv.config({ path: backendEnvPath, override: false });

const isTestEnv = process.env.NODE_ENV === "test";
if (isTestEnv) {
  process.env.NODE_ENV = "test";
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(2000),
    MONGODB_URI: z.string().default("mongodb://localhost:27017/blog_db"),
    JWT_SECRET: z
      .string()
      .min(16, "JWT_SECRET must be at least 16 characters long")
      .default("fallback_secret_for_local_development_only_123456"),
    JWT_EXPIRES_IN: z.string().default("3600"),
    CLIENT_URL: z.string().default("http://localhost:3000"),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    // email59 HTTPS API configuration
    EMAIL59_KEY: z.string().optional(),
    EMAIL59_FROM: z.string().default("blogplatform"),
    EMAIL_FROM: z.string().optional(),
    // Optional SMTP configuration (retained for fallback compatibility if configured)
    SMTP_HOST: z.string().default("smtp.gmail.com"),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: z.preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }, z.boolean().default(false)),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.EMAIL59_KEY && (!data.SMTP_USER || !data.SMTP_PASS)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EMAIL59_KEY"],
          message: "EMAIL59_KEY is required in production environment.",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check your .env file.");
}

export const env = parsed.data;
export default env;
