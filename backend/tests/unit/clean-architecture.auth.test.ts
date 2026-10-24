import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../../src/application/services/AuthService.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import type { IUserRepository } from "../../src/domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../src/domain/repositories/IOtpRepository.js";
import type { IUser } from "../../src/domain/entities/User.js";
import type { IOtp } from "../../src/domain/entities/Otp.js";
import type { ITokenService } from "../../src/application/interfaces/ITokenService.js";
import type { IEmailService } from "../../src/application/interfaces/IEmailService.js";
import { BcryptPasswordHasher } from "../../src/infrastructure/security/BcryptPasswordHasher.js";

describe("Clean Architecture - Application AuthService", () => {
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
      generateAccessToken: vi.fn().mockReturnValue("clean-mock-token"),
      verifyAccessToken: vi.fn(),
    };

    mockOtpRepo = {
      create: vi.fn().mockResolvedValue({ id: "otp-clean-123", email: "test@example.com" } as IOtp),
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

  it("should initiate signup using purely injected domain ports", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

    const result = await authService.initiateSignup("Alice", "alice@example.com", "Password123!");

    expect(result).toEqual({ success: true, message: "OTP sent to email" });
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("alice@example.com");
    expect(mockOtpRepo.create).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendOtp).toHaveBeenCalledWith("alice@example.com", expect.stringMatching(/^\d{6}$/));
  });

  it("should verify reset OTP and return a signed reset token via tokenService", async () => {
    const bcrypt = await import("bcryptjs");
    const hashedCode = await bcrypt.hash("123456", 12);

    vi.mocked(mockOtpRepo.findValid).mockResolvedValue({
      id: "otp-1",
      email: "alice@example.com",
      codeHash: hashedCode,
    } as IOtp);

    const result = await authService.verifyResetOtp("alice@example.com", "123456");

    expect(result.success).toBe(true);
    expect(result.resetToken).toBe("clean-mock-token");
    expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith({
      sub: "alice@example.com",
      email: "alice@example.com",
    });
  });
});
