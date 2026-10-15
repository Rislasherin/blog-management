import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    code: z.string().length(6, "OTP must be exactly 6 digits"),
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .strict();

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;