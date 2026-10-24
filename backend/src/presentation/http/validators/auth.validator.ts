import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  code: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits"),
  name: z.string().min(2, "Name must be at least 2 characters long").trim(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export const verifyResetOtpSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  code: z.string().length(6, "Reset code must be exactly 6 digits").regex(/^\d+$/, "Reset code must contain only digits"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  code: z.string().length(6, "Reset code must be exactly 6 digits").regex(/^\d+$/, "Reset code must contain only digits").optional(),
  resetToken: z.string().optional(),
}).refine((data) => data.code || data.resetToken, {
  message: "Either verification code or reset token must be provided",
  path: ["code"],
});

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
