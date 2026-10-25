import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodemailerEmailService } from "../../src/infrastructure/email/NodemailerEmailService.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import { createContainer } from "../../src/infrastructure/di/container.js";
import type { Transporter } from "nodemailer";

describe("NodemailerEmailService Unit Tests", () => {
  let mockTransporter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransporter = {
      sendMail: vi.fn(),
      verify: vi.fn(),
    };
  });

  describe("1. Configuration and Transporter Resolution", () => {
    it("should default to port 587 with STARTTLS (secure: false)", () => {
      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);
      const config = emailService.getEffectiveConfig();

      expect(config.host).toBe("smtp.gmail.com");
      expect(config.port).toBe(587);
      expect(config.secure).toBe(false);
    });

    it("should instantiate NodemailerEmailService by default in createContainer", () => {
      const container = createContainer();
      expect(container.emailService).toBeInstanceOf(NodemailerEmailService);
    });
  });

  describe("2. Successful OTP email submission", () => {
    it("should successfully send an OTP email with correct recipient, subject, and rendered templates", async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: "<msg-12345@smtp.gmail.com>",
        accepted: ["test@example.com"],
        rejected: [],
      });

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);
      await emailService.sendOtp("test@example.com", "123456");

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const mailArgs = mockTransporter.sendMail.mock.calls[0][0];

      expect(mailArgs.to).toBe("test@example.com");
      expect(mailArgs.from).toContain("BlogPlatform");
      expect(mailArgs.subject).toBe("Your BlogPlatform Verification Code");
      expect(mailArgs.text).toContain("123456");
      expect(mailArgs.html).toContain("123456");
    });
  });

  describe("3. Unconfigured / Missing SMTP credentials", () => {
    it("should throw AppError(500) when transporter is not initialized, preventing silent false success", async () => {
      const emailService = new NodemailerEmailService(null);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toThrow(AppError);
      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Email delivery is not configured on the server"),
      });
    });
  });

  describe("4. Recipient rejection handling", () => {
    it("should throw AppError(400) when SMTP returns recipient rejected in sendMail info", async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: "<msg-rejected>",
        accepted: [],
        rejected: ["invalid-recipient@domain.com"],
      });

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);

      await expect(emailService.sendOtp("invalid-recipient@domain.com", "123456")).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("could not be delivered to this email address"),
      });
    });

    it("should throw AppError(400) when SMTP throws 550 Mailbox not found error", async () => {
      const smtpErr = new Error("5.1.1 User unknown");
      (smtpErr as any).responseCode = 550;
      (smtpErr as any).code = "EENVELOPE";
      mockTransporter.sendMail.mockRejectedValue(smtpErr);

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);

      await expect(emailService.sendOtp("unknown@domain.com", "123456")).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("could not be delivered to this email address"),
      });
    });
  });

  describe("5. Authentication failure handling", () => {
    it("should throw AppError(500) when SMTP authentication fails (EAUTH / 535)", async () => {
      const authErr = new Error("535 5.7.8 Username and Password not accepted");
      (authErr as any).code = "EAUTH";
      (authErr as any).responseCode = 535;
      mockTransporter.sendMail.mockRejectedValue(authErr);

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Failed to deliver verification email"),
      });
    });
  });

  describe("6. Connection timeout & network restriction handling", () => {
    it("should throw AppError(500) when SMTP connection times out (ETIMEDOUT) without automatic port switching", async () => {
      const timeoutErr = new Error("Connection timeout");
      (timeoutErr as any).code = "ETIMEDOUT";
      (timeoutErr as any).syscall = "connect";
      mockTransporter.sendMail.mockRejectedValue(timeoutErr);

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Failed to deliver verification email"),
      });

      // Crucial: verify sendMail was called exactly once — no endless retries or secondary port attempt
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it("should throw AppError(500) when SMTP connection is refused (ECONNREFUSED)", async () => {
      const connErr = new Error("connect ECONNREFUSED");
      (connErr as any).code = "ECONNREFUSED";
      mockTransporter.sendMail.mockRejectedValue(connErr);

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);

      await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Failed to deliver verification email"),
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe("7. verifyConnection diagnostics", () => {
    it("should return success: true when transporter.verify resolves", async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain("verified successfully");
      expect(result.details?.host).toBe("smtp.gmail.com");
      expect(result.details?.port).toBe(587);
    });

    it("should return success: false when transporter.verify rejects with connection timeout", async () => {
      const timeoutErr = new Error("Connection timeout");
      (timeoutErr as any).code = "ETIMEDOUT";
      mockTransporter.verify.mockRejectedValue(timeoutErr);

      const emailService = new NodemailerEmailService(mockTransporter as unknown as Transporter);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("SMTP connection verification failed");
      expect(result.details?.code).toBe("ETIMEDOUT");
    });

    it("should return success: false when transporter is null", async () => {
      const emailService = new NodemailerEmailService(null);
      const result = await emailService.verifyConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("SMTP transporter is not initialized");
    });
  });
});
