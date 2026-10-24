import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../../src/application/services/AuthService.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import type { IUserRepository } from "../../src/domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../src/domain/repositories/IOtpRepository.js";
import type { IUser } from "../../src/domain/entities/User.js";
import type { ITokenService } from "../../src/application/interfaces/ITokenService.js";
import type { IEmailService } from "../../src/application/interfaces/IEmailService.js";
import { BcryptPasswordHasher } from "../../src/infrastructure/security/BcryptPasswordHasher.js";

describe("AuthService Email & OTP Flow Tests", () => {
  let mockUserRepo: IUserRepository;
  let mockTokenService: ITokenService;
  let mockOtpRepo: IOtpRepository;
  let mockEmailService: IEmailService;
  let authService: AuthService;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updatePassword: vi.fn(),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockReturnValue("mock-token"),
      verifyAccessToken: vi.fn(),
    };

    mockOtpRepo = {
      create: vi.fn().mockResolvedValue({ _id: "otp-id-123" }),
      findValid: vi.fn(),
      markAsUsed: vi.fn(),
      incrementAttempts: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue(1),
    };

    mockEmailService = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      mockUserRepo,
      mockTokenService,
      mockOtpRepo,
      mockEmailService,
      undefined,
      undefined,
      new BcryptPasswordHasher()
    );
  });

  describe("initiateSignup", () => {
    it("should successfully generate OTP, persist it, and dispatch email", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const result = await authService.initiateSignup(
        "John Doe",
        "john@example.com",
        "SecurePassword123"
      );

      expect(result).toEqual({ success: true, message: "OTP sent to email" });
      expect(mockOtpRepo.create).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendOtp).toHaveBeenCalledWith(
        "john@example.com",
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it("should reject if user already exists", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        _id: "user-1",
        email: "john@example.com",
      } as unknown as IUser);

      await expect(
        authService.initiateSignup("John Doe", "john@example.com", "Password123")
      ).rejects.toThrow(AppError);

      expect(mockOtpRepo.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendOtp).not.toHaveBeenCalled();
    });

    it("should clean up created OTP and rethrow if email dispatch fails", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockEmailService.sendOtp).mockRejectedValue(
        new AppError(500, "Failed to deliver verification email.")
      );

      await expect(
        authService.initiateSignup("John Doe", "john@example.com", "Password123")
      ).rejects.toThrow(AppError);

      expect(mockOtpRepo.deleteMany).toHaveBeenCalledWith({ _id: "otp-id-123" });
    });
  });

  describe("forgotPassword", () => {
    it("should successfully generate reset OTP and dispatch email", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        _id: "user-1",
        email: "john@example.com",
      } as unknown as IUser);

      const result = await authService.forgotPassword("john@example.com");

      expect(result).toEqual({
        success: true,
        message: "Password reset code sent to your email",
      });
      expect(mockOtpRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "john@example.com",
          purpose: "reset",
        })
      );
      expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(1);
    });

    it("should throw 404 if email does not exist", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      await expect(authService.forgotPassword("nonexistent@example.com")).rejects.toThrow(
        AppError
      );

      expect(mockOtpRepo.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendOtp).not.toHaveBeenCalled();
    });

    it("should clean up reset OTP if email dispatch fails", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        _id: "user-1",
        email: "john@example.com",
      } as unknown as IUser);
      vi.mocked(mockEmailService.sendOtp).mockRejectedValue(
        new AppError(500, "SMTP connection failure")
      );

      await expect(authService.forgotPassword("john@example.com")).rejects.toThrow(
        AppError
      );

      expect(mockOtpRepo.deleteMany).toHaveBeenCalledWith({ _id: "otp-id-123" });
    });
  });
});
