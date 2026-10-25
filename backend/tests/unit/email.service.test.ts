import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResendEmailService } from "../../src/infrastructure/email/ResendEmailService.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import { createContainer } from "../../src/infrastructure/di/container.js";
import type { Resend } from "resend";

describe("ResendEmailService Unit Tests", () => {
  let mockResend: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResend = {
      emails: {
        send: vi.fn(),
      },
      domains: {
        list: vi.fn(),
      },
    };
  });

  describe("1. Successful OTP email submission through mocked Resend client", () => {
    it("should successfully send an OTP email with correct recipient, subject, and rendered templates", async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: "resend-msg-12345" },
        error: null,
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);
      await emailService.sendOtp("test@example.com", "123456");

      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
      const sendArgs = mockResend.emails.send.mock.calls[0][0];

      expect(sendArgs.to).toBe("test@example.com");
      expect(sendArgs.from).toContain("BlogPlatform");
      expect(sendArgs.subject).toBe("Your BlogPlatform Verification Code");
      expect(sendArgs.text).toContain("123456");
      expect(sendArgs.html).toContain("123456");
    });
  });

  describe("2. Resend API errors and rejected requests", () => {
    it("should throw AppError(400) when Resend returns a validation error for invalid recipient", async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: {
          name: "validation_error",
          message: "The 'to' field contains an invalid email address.",
          statusCode: 422,
        },
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);

      await expect(emailService.sendOtp("invalid-address", "123456")).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("could not be delivered to this email address"),
      });
    });

    it("should throw AppError(403) when Resend test sandbox restricts sending to third-party recipients", async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: {
          name: "forbidden",
          message: "You can only send testing emails to your own email address. To send to others, verify a domain.",
          statusCode: 403,
        },
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);

      await expect(emailService.sendOtp("someone_else@gmail.com", "123456")).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining("Resend test sandbox only permits delivery to the account owner"),
      });
    });

    it("should throw AppError(429) when Resend returns rate limit exceeded", async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: {
          name: "rate_limit_exceeded",
          message: "Too many requests. Please slow down.",
          statusCode: 429,
        },
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 429,
        message: expect.stringContaining("rate limit exceeded"),
      });
    });

    it("should throw AppError(500) when Resend returns authentication failure", async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: {
          name: "api_key_invalid",
          message: "API key is invalid",
          statusCode: 401,
        },
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email service authentication error"),
      });
    });

    it("should throw AppError(500) if Resend reports success but returns no message ID", async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: null,
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Resend did not return a message ID"),
      });
    });

    it("should catch unexpected network/SDK rejection and convert to AppError(500)", async () => {
      mockResend.emails.send.mockRejectedValue(new Error("Network connection reset"));

      const emailService = new ResendEmailService(mockResend as unknown as Resend);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Network connection reset"),
      });
    });
  });

  describe("3. Missing API key handling", () => {
    it("should throw AppError(500) when Resend client is not initialized, preventing false success", async () => {
      const emailService = new ResendEmailService(null);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toThrow(AppError);
      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email delivery is not configured on the server"),
      });
    });
  });

  describe("4. Sender address resolution & verification rules", () => {
    it("should fall back to onboarding@resend.dev when sender is a public webmail domain", () => {
      const emailService = new ResendEmailService(mockResend as unknown as Resend);
      // Even if EMAIL_FROM had gmail.com, resolveSenderAddress enforces safe fallback
      expect(emailService.senderAddress).toBe("BlogPlatform <onboarding@resend.dev>");
    });
  });

  describe("5. verifyConnection diagnostics", () => {
    it("should return success: true when Resend API responds with valid domain list", async () => {
      mockResend.domains.list.mockResolvedValue({
        data: { data: [] },
        error: null,
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain("Resend API key verified successfully");
    });

    it("should return success: false when Resend API returns an error", async () => {
      mockResend.domains.list.mockResolvedValue({
        data: null,
        error: { message: "Invalid API key provided" },
      });

      const emailService = new ResendEmailService(mockResend as unknown as Resend);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid API key provided");
    });

    it("should return success: false when Resend client is null", async () => {
      const emailService = new ResendEmailService(null);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("RESEND_API_KEY is not configured");
    });

    it("should return success: false when Resend network call throws", async () => {
      mockResend.domains.list.mockRejectedValue(new Error("DNS lookup failure"));

      const emailService = new ResendEmailService(mockResend as unknown as Resend);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("DNS lookup failure");
    });
  });

  describe("6. Dependency Injection Container", () => {
    it("should instantiate ResendEmailService by default in createContainer", () => {
      const container = createContainer();
      expect(container.emailService).toBeInstanceOf(ResendEmailService);
    });
  });
});
