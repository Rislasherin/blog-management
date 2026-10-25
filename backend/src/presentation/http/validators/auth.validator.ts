import { z } from "zod";

/**
 * Standard email validator: trims, lowercases, checks RFC email format and max length.
 */
export const emailValidator = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email must not exceed 254 characters")
  .email("Invalid email address");

/**
 * Standard name validator: trims, enforces 2-100 characters, rejects whitespace-only, restricts characters.
 */
export const nameValidator = z
  .string({ error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters long")
  .max(100, "Name must not exceed 100 characters")
  .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

/**
 * Standard password validator: enforces 8-128 characters, rejects whitespace-only.
 * Note: password itself is not trimmed to avoid altering intentional characters.
 */
export const passwordValidator = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must not exceed 128 characters")
  .refine((val) => val.trim().length > 0, {
    message: "Password cannot be empty or whitespace only",
  });

/**
 * 6-digit numeric OTP validator.
 */
export const otpCodeValidator = z
  .string({ error: "Verification code is required" })
  .trim()
  .length(6, "Verification code must be exactly 6 digits")
  .regex(/^\d{6}$/, "Verification code must contain only digits");

export const registerSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
});

export const loginSchema = z.object({
  email: emailValidator,
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password must not exceed 128 characters"),
});

export const verifyOtpSchema = z
  .object({
    email: emailValidator,
    code: otpCodeValidator.optional(),
    otp: otpCodeValidator.optional(),
    name: nameValidator,
    password: passwordValidator,
  })
  .refine((data) => data.code !== undefined || data.otp !== undefined, {
    message: "Verification code is required",
    path: ["code"],
  })
  .transform((data) => ({
    ...data,
    code: data.code || data.otp!,
    otp: data.otp || data.code!,
  }));

export const forgotPasswordSchema = z.object({
  email: emailValidator,
});

export const verifyResetOtpSchema = z
  .object({
    email: emailValidator,
    code: otpCodeValidator.optional(),
    otp: otpCodeValidator.optional(),
  })
  .refine((data) => data.code !== undefined || data.otp !== undefined, {
    message: "Verification code is required",
    path: ["code"],
  })
  .transform((data) => ({
    ...data,
    code: data.code || data.otp!,
    otp: data.otp || data.code!,
  }));

export const resetPasswordSchema = z
  .object({
    email: emailValidator,
    password: passwordValidator,
    code: otpCodeValidator.optional(),
    resetToken: z.string().trim().optional(),
  })
  .refine((data) => data.code || data.resetToken, {
    message: "Either verification code or reset token must be provided",
    path: ["code"],
  });

export const resendOtpSchema = z.object({
  email: emailValidator,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
