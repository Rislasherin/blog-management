import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodemailerEmailService as EmailService } from "../../src/infrastructure/email/NodemailerEmailService.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import type { Transporter } from "nodemailer";

describe("EmailService Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully send an OTP email when a valid transporter is configured", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
    const mockTransporter = {
      sendMail: mockSendMail,
    } as unknown as Transporter;

    const emailService = new EmailService(mockTransporter);
    await emailService.sendOtp("test@example.com", "123456");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.to).toBe("test@example.com");
    expect(mailArgs.subject).toContain("Verification Code");
    expect(mailArgs.text).toContain("123456");
    expect(mailArgs.html).toContain("123456");
  });

  it("should throw AppError(500) if transporter.sendMail fails due to SMTP auth failure or timeout", async () => {
    const mockSendMail = vi.fn().mockRejectedValue(new Error("535 5.7.8 Username and Password not accepted"));
    const mockTransporter = {
      sendMail: mockSendMail,
    } as unknown as Transporter;

    const emailService = new EmailService(mockTransporter);

    await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toThrow(AppError);
    await expect(emailService.sendOtp("test@example.com", "123456")).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("should throw AppError(500) if provider rejects the recipient address", async () => {
    const mockSendMail = vi.fn().mockRejectedValue(new Error("550 5.1.1 User unknown / recipient rejected"));
    const mockTransporter = {
      sendMail: mockSendMail,
    } as unknown as Transporter;

    const emailService = new EmailService(mockTransporter);

    await expect(emailService.sendOtp("invalid-user@example.com", "123456")).rejects.toThrow(AppError);
  });

  it("should throw AppError(500) when SMTP is not configured, preventing false success", async () => {
    // Transporter is null
    const emailService = new EmailService(null as unknown as Transporter);

    await expect(emailService.sendOtp("dev@example.com", "654321")).rejects.toThrow(AppError);
    await expect(emailService.sendOtp("dev@example.com", "654321")).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining("Email delivery is not configured"),
    });
  });

  it("should return success when verifyConnection succeeds", async () => {
    const mockVerify = vi.fn().mockResolvedValue(true);
    const mockTransporter = {
      verify: mockVerify,
    } as unknown as Transporter;

    const emailService = new EmailService(mockTransporter);
    const result = await emailService.verifyConnection();

    expect(result.success).toBe(true);
    expect(result.message).toContain("verified successfully");
  });

  it("should return failure details when verifyConnection fails", async () => {
    const mockVerify = vi.fn().mockRejectedValue(new Error("Connection refused on port 465"));
    const mockTransporter = {
      verify: mockVerify,
    } as unknown as Transporter;

    const emailService = new EmailService(mockTransporter);
    const result = await emailService.verifyConnection();

    expect(result.success).toBe(false);
    expect(result.message).toContain("Connection refused on port 465");
  });
});
