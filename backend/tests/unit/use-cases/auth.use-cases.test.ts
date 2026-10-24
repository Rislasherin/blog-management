import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterUserUseCase } from "../../../src/application/use-cases/auth/implementations/RegisterUserUseCase.js";
import { VerifyOtpUseCase } from "../../../src/application/use-cases/auth/implementations/VerifyOtpUseCase.js";
import { LoginUseCase } from "../../../src/application/use-cases/auth/implementations/LoginUseCase.js";
import { RequestPasswordResetUseCase } from "../../../src/application/use-cases/auth/implementations/RequestPasswordResetUseCase.js";
import { VerifyResetOtpUseCase } from "../../../src/application/use-cases/auth/implementations/VerifyResetOtpUseCase.js";
import { ResetPasswordUseCase } from "../../../src/application/use-cases/auth/implementations/ResetPasswordUseCase.js";
import { AppError } from "../../../src/domain/errors/AppError.js";
import type { IUserRepository } from "../../../src/domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../../src/domain/repositories/IOtpRepository.js";
import type { ITokenService } from "../../../src/application/interfaces/ITokenService.js";
import type { IEmailService } from "../../../src/application/interfaces/IEmailService.js";
import type { IPasswordHasher } from "../../../src/application/interfaces/IPasswordHasher.js";
import type { IUser } from "../../../src/domain/entities/User.js";
import type { IOtp } from "../../../src/domain/entities/Otp.js";
import { BcryptPasswordHasher } from "../../../src/infrastructure/security/BcryptPasswordHasher.js";
import bcrypt from "bcryptjs";

describe("Auth Use Cases (Clean Architecture Unit Tests)", () => {
  let mockUserRepo: IUserRepository;
  let mockOtpRepo: IOtpRepository;
  let mockTokenService: ITokenService;
  let mockEmailService: IEmailService;
  let hasher: IPasswordHasher;

  beforeEach(() => {
    hasher = new BcryptPasswordHasher();
    mockUserRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updatePassword: vi.fn(),
    } as unknown as IUserRepository;

    mockOtpRepo = {
      create: vi.fn().mockResolvedValue({ id: "otp-1", codeHash: "hashed-code" } as IOtp),
      findValid: vi.fn(),
      markAsUsed: vi.fn(),
      incrementAttempts: vi.fn(),
      deleteById: vi.fn().mockResolvedValue(true),
      deleteMany: vi.fn().mockResolvedValue(1),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockReturnValue("jwt-token-xyz"),
      verifyAccessToken: vi.fn(),
    };

    mockEmailService = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
      verifyConnection: vi.fn().mockResolvedValue({ success: true, message: "OK" }),
    };
  });

  describe("RegisterUserUseCase", () => {
    it("should initiate signup by generating OTP, persisting it, and sending email", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const useCase = new RegisterUserUseCase(mockUserRepo, mockOtpRepo, mockEmailService, hasher);
      const result = await useCase.execute({
        name: "Alice",
        email: "alice@example.com",
        password: "password123",
      });

      expect(result).toEqual({ success: true, message: "OTP sent to email" });
      expect(mockOtpRepo.create).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(1);
    });

    it("should reject signup when email is already taken", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: "user-1",
        name: "Existing",
        email: "alice@example.com",
      } as IUser);

      const useCase = new RegisterUserUseCase(mockUserRepo, mockOtpRepo, mockEmailService, hasher);
      await expect(
        useCase.execute({ name: "Alice", email: "alice@example.com", password: "pwd" })
      ).rejects.toThrow(AppError);
    });
  });

  describe("VerifyOtpUseCase", () => {
    it("should verify valid OTP and create user", async () => {
      const code = "123456";
      const codeHash = await bcrypt.hash(code, 10);
      vi.mocked(mockOtpRepo.findValid).mockResolvedValue({
        id: "otp-1",
        email: "alice@example.com",
        codeHash,
      } as IOtp);

      vi.mocked(mockUserRepo.create).mockResolvedValue({
        id: "user-created-1",
        name: "Alice",
        email: "alice@example.com",
      } as IUser);

      const useCase = new VerifyOtpUseCase(mockUserRepo, mockOtpRepo, hasher);
      const user = await useCase.execute({
        email: "alice@example.com",
        otp: code,
        name: "Alice",
        password: "securepassword",
      });

      expect(user.id).toBe("user-created-1");
      expect(user.email).toBe("alice@example.com");
      expect(mockOtpRepo.markAsUsed).toHaveBeenCalledWith("otp-1");
    });
  });

  describe("LoginUseCase", () => {
    it("should verify credentials and return accessToken", async () => {
      const rawPassword = "password123";
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: "u-123",
        name: "Bob",
        email: "bob@example.com",
        password: hashedPassword,
      } as IUser);

      const useCase = new LoginUseCase(mockUserRepo, mockTokenService, hasher);
      const result = await useCase.execute({ email: "bob@example.com", password: rawPassword });

      expect(result.accessToken).toBe("jwt-token-xyz");
      expect(result.user.id).toBe("u-123");
    });
  });

  describe("RequestPasswordResetUseCase", () => {
    it("should issue a password reset OTP to existing user", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: "u-1",
        name: "Bob",
        email: "bob@example.com",
      } as IUser);

      const useCase = new RequestPasswordResetUseCase(mockUserRepo, mockOtpRepo, mockEmailService, hasher);
      const res = await useCase.execute("bob@example.com");

      expect(res.success).toBe(true);
      expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(1);
    });
  });

  describe("VerifyResetOtpUseCase", () => {
    it("should verify reset code and return a signed reset token", async () => {
      const code = "654321";
      const codeHash = await bcrypt.hash(code, 10);
      vi.mocked(mockOtpRepo.findValid).mockResolvedValue({
        id: "otp-reset-1",
        email: "bob@example.com",
        codeHash,
      } as IOtp);

      const useCase = new VerifyResetOtpUseCase(mockOtpRepo, mockTokenService, hasher);
      const res = await useCase.execute("bob@example.com", code);

      expect(res.success).toBe(true);
      expect(res.resetToken).toBe("jwt-token-xyz");
    });
  });

  describe("ResetPasswordUseCase", () => {
    it("should update user password given a valid resetToken", async () => {
      vi.mocked(mockTokenService.verifyAccessToken).mockReturnValue({
        sub: "bob@example.com",
        email: "bob@example.com",
      });
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: "u-1",
        email: "bob@example.com",
      } as IUser);

      const useCase = new ResetPasswordUseCase(mockUserRepo, mockOtpRepo, mockTokenService, hasher);
      const res = await useCase.execute({
        email: "bob@example.com",
        password: "brandNewPassword123",
        resetToken: "jwt-token-xyz",
      });

      expect(res.success).toBe(true);
      expect(mockUserRepo.updatePassword).toHaveBeenCalledTimes(1);
    });
  });
});
