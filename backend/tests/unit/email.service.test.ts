import { describe, it, expect, vi, beforeEach } from "vitest";
import { Email59EmailService } from "../../src/infrastructure/email/Email59EmailService.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import { createContainer } from "../../src/infrastructure/di/container.js";

describe("Email59EmailService Unit Tests", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
  });

  describe("1. Configuration and Dependency Injection", () => {
    it("should instantiate Email59EmailService by default in createContainer", () => {
      const container = createContainer();
      expect(container.emailService).toBeInstanceOf(Email59EmailService);
    });

    it("should resolve effective sender to blogplatform@email59.com", () => {
      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);
      expect(emailService.getEffectiveSender()).toBe("blogplatform@email59.com");
    });
  });

  describe("2. Successful OTP email submission", () => {
    it("should call email59 /v1/send with correct headers, sender, and payload", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "msg_email59_12345",
            status: "sent",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);
      await emailService.sendOtp("newuser@example.com", "849201");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://email59.com/v1/send");
      expect(options.method).toBe("POST");
      expect(options.headers["Authorization"]).toBe("Bearer e59_test_key");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body.from).toBe("blogplatform");
      expect(body.to).toBe("newuser@example.com");
      expect(body.subject).toBe("Your BlogPlatform Verification Code");
      expect(body.category).toBe("transactional");
      expect(body.text).toContain("849201");
      expect(body.html).toContain("849201");
    });
  });

  describe("3. Unconfigured / Missing API key", () => {
    it("should throw AppError(500) when EMAIL59_KEY is missing", async () => {
      const emailService = new Email59EmailService("", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toThrow(AppError);
      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email delivery is not configured on the server"),
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("4. Recipient rejection handling", () => {
    it("should throw AppError(400) when email59 returns 422 recipient_rejected", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "recipient_rejected",
            verdict: "disposable",
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("disposable@mailinator.com", "123456")).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("could not be delivered to this email address"),
      });
    });

    it("should throw AppError(400) when email59 returns 400 invalid_email", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "invalid_email",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("invalid-address", "123456")).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("could not be delivered to this email address"),
      });
    });
  });

  describe("5. Allowance and rate limit handling", () => {
    it("should throw AppError(429) when email59 returns daily_limit_reached", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "daily_limit_reached",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 429,
        message: expect.stringContaining("Email sending allowance reached for today"),
      });
    });
  });

  describe("6. Authentication and provider errors", () => {
    it("should throw AppError(500) when email59 returns 401 invalid_api_key", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "invalid_api_key",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_bad_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email service authentication error"),
      });
    });

    it("should throw AppError(500) when email59 returns 502 provider_error", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "provider_error",
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Failed to deliver verification email"),
      });
    });
  });

  describe("7. Network failures and timeouts", () => {
    it("should throw AppError(500) on request timeout (AbortError)", async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortErr);

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email service request timed out"),
      });
    });

    it("should throw AppError(500) on network connection failure", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed: ENOTFOUND email59.com"));

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email service connection failed"),
      });
    });
  });

  describe("8. verifyConnection diagnostics", () => {
    it("should return success: true when /v1/account responds with account details", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            daily_limit: 200,
            sent_today: 5,
            remaining_today: 195,
            credits_remaining: 500,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain("Remaining emails today: 195/200");
      expect(result.details?.sender).toBe("blogplatform@email59.com");
      expect(result.details?.dailyLimit).toBe(200);
      expect(result.details?.remainingToday).toBe(195);
    });

    it("should return success: false when /v1/account returns 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "invalid_api_key",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );

      const emailService = new Email59EmailService("e59_bad_key", mockFetch as unknown as typeof fetch);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("account verification failed (401)");
    });

    it("should return success: false when API key is empty", async () => {
      const emailService = new Email59EmailService("", mockFetch as unknown as typeof fetch);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("EMAIL59_KEY is not configured");
    });

    it("should return success: false when network error occurs", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const emailService = new Email59EmailService("e59_test_key", mockFetch as unknown as typeof fetch);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to fetch");
    });
  });
});
