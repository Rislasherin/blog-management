import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "../../src/presentation/http/validators/auth.validator.js";

describe("Auth Validators Unit Tests", () => {
  describe("registerSchema", () => {
    it("should accept valid registration payload and normalize email", () => {
      const input = {
        name: "  Jane Doe  ",
        email: "  Jane.Doe@EXAMPLE.COM  ",
        password: "ValidPassword123!",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Jane Doe");
        expect(result.data.email).toBe("jane.doe@example.com");
        expect(result.data.password).toBe("ValidPassword123!");
      }
    });

    it("should reject missing required fields", () => {
      const result = registerSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map((i) => i.path[0]);
        expect(issues).toContain("name");
        expect(issues).toContain("email");
        expect(issues).toContain("password");
      }
    });

    it("should reject whitespace-only name", () => {
      const result = registerSchema.safeParse({
        name: "     ",
        email: "test@example.com",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/at least 2 characters|letters/i);
      }
    });

    it("should reject name shorter than 2 characters", () => {
      const result = registerSchema.safeParse({
        name: "A",
        email: "test@example.com",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 100 characters", () => {
      const result = registerSchema.safeParse({
        name: "A".repeat(101),
        email: "test@example.com",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name with invalid characters (e.g. script tags)", () => {
      const result = registerSchema.safeParse({
        name: "Jane <script>",
        email: "test@example.com",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "notanemail",
        "user@",
        "@domain.com",
        "user@domain",
        "user@.com",
        "   ",
      ];
      for (const email of invalidEmails) {
        const result = registerSchema.safeParse({
          name: "Jane Doe",
          email,
          password: "ValidPassword123!",
        });
        expect(result.success).toBe(false);
      }
    });

    it("should reject email longer than 254 characters", () => {
      const longEmail = `${"a".repeat(245)}@example.com`;
      const result = registerSchema.safeParse({
        name: "Jane Doe",
        email: longEmail,
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = registerSchema.safeParse({
        name: "Jane Doe",
        email: "test@example.com",
        password: "Short1!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password longer than 128 characters", () => {
      const result = registerSchema.safeParse({
        name: "Jane Doe",
        email: "test@example.com",
        password: "P".repeat(129),
      });
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only password", () => {
      const result = registerSchema.safeParse({
        name: "Jane Doe",
        email: "test@example.com",
        password: "        ",
      });
      expect(result.success).toBe(false);
    });

    it("should preserve password characters without trimming them", () => {
      const passwordWithSpaces = "  passwordwithspaces123  ";
      const result = registerSchema.safeParse({
        name: "Jane Doe",
        email: "test@example.com",
        password: passwordWithSpaces,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe(passwordWithSpaces);
      }
    });

    it("should reject unexpected types for name, email, and password", () => {
      const result = registerSchema.safeParse({
        name: 12345,
        email: { address: "test@example.com" },
        password: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login and normalize email", () => {
      const result = loginSchema.safeParse({
        email: "  USER@EXAMPLE.COM ",
        password: "mypassword123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.password).toBe("mypassword123");
      }
    });

    it("should reject missing email or password", () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only email", () => {
      const result = loginSchema.safeParse({
        email: "   ",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const result = loginSchema.safeParse({
        email: "bad-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("verifyOtpSchema", () => {
    it("should accept valid verification payload with 6-digit numeric OTP", () => {
      const result = verifyOtpSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        otp: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("should accept alternative field name 'code'", () => {
      const result = verifyOtpSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        code: "654321",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric OTP code", () => {
      const result = verifyOtpSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        otp: "12345a",
      });
      expect(result.success).toBe(false);
    });

    it("should reject OTP code of wrong length", () => {
      const resultTooShort = verifyOtpSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        otp: "12345",
      });
      expect(resultTooShort.success).toBe(false);

      const resultTooLong = verifyOtpSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        otp: "1234567",
      });
      expect(resultTooLong.success).toBe(false);
    });
  });

  describe("resendOtpSchema", () => {
    it("should accept valid email and normalize it", () => {
      const result = resendOtpSchema.safeParse({
        email: "  RESEND@EXAMPLE.COM  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("resend@example.com");
      }
    });

    it("should reject missing or malformed email", () => {
      expect(resendOtpSchema.safeParse({}).success).toBe(false);
      expect(resendOtpSchema.safeParse({ email: "invalid" }).success).toBe(false);
      expect(resendOtpSchema.safeParse({ email: "   " }).success).toBe(false);
    });
  });
});
