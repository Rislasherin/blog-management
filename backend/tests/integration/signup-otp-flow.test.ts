import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createContainer } from "../../src/infrastructure/di/container.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import { HttpStatus } from "../../src/domain/enums/HttpStatus.enum.js";
import type { IUserRepository } from "../../src/domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../src/domain/repositories/IOtpRepository.js";
import type { IEmailService } from "../../src/application/interfaces/IEmailService.js";
import type { IUser } from "../../src/domain/entities/User.js";
import type { IOtp } from "../../src/domain/entities/Otp.js";
import bcrypt from "bcryptjs";

describe("Signup OTP Flow Integration Tests", () => {
  let inMemoryUsers: IUser[];
  let inMemoryOtps: IOtp[];
  let mockUserRepo: IUserRepository;
  let mockOtpRepo: IOtpRepository;
  let mockEmailService: IEmailService;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    inMemoryUsers = [];
    inMemoryOtps = [];

    mockUserRepo = {
      findByEmail: vi.fn(async (email: string) => {
        return inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
      }),
      findById: vi.fn(async (id: string) => {
        return inMemoryUsers.find((u) => u.id === id) || null;
      }),
      create: vi.fn(async (data: { name: string; email: string; password?: string }) => {
        const user: IUser = {
          id: `u-${Date.now()}-${Math.random()}`,
          name: data.name,
          email: data.email.toLowerCase(),
          password: data.password || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryUsers.push(user);
        return user;
      }),
      updatePassword: vi.fn(),
    } as unknown as IUserRepository;

    mockOtpRepo = {
      create: vi.fn(async (data: { email: string; purpose: any; codeHash: string; expiresAt: Date }) => {
        const otp: IOtp = {
          id: `otp-${Date.now()}-${Math.random()}`,
          email: data.email.toLowerCase(),
          purpose: data.purpose,
          codeHash: data.codeHash,
          expiresAt: data.expiresAt,
          used: false,
          attempts: 0,
          createdAt: new Date(),
        };
        inMemoryOtps.push(otp);
        return otp;
      }),
      findValid: vi.fn(async (email: string, purpose: any) => {
        const now = new Date();
        const valid = inMemoryOtps
          .filter(
            (o) =>
              o.email.toLowerCase() === email.toLowerCase() &&
              o.purpose === purpose &&
              !o.used &&
              new Date(o.expiresAt) > now
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return valid[0] || null;
      }),
      markAsUsed: vi.fn(async (id: string) => {
        const otp = inMemoryOtps.find((o) => o.id === id);
        if (otp) otp.used = true;
        return otp || null;
      }),
      incrementAttempts: vi.fn(async (id: string) => {
        const otp = inMemoryOtps.find((o) => o.id === id);
        if (otp) otp.attempts = (otp.attempts || 0) + 1;
        return otp || null;
      }),
      deleteById: vi.fn(async (id: string) => {
        const idx = inMemoryOtps.findIndex((o) => o.id === id);
        if (idx !== -1) {
          inMemoryOtps.splice(idx, 1);
          return true;
        }
        return false;
      }),
      deleteMany: vi.fn(async (filter: { email?: string; purpose?: any }) => {
        const initial = inMemoryOtps.length;
        inMemoryOtps = inMemoryOtps.filter(
          (o) =>
            (filter.email && o.email.toLowerCase() !== filter.email.toLowerCase()) ||
            (filter.purpose && o.purpose !== filter.purpose)
        );
        return initial - inMemoryOtps.length;
      }),
    };

    mockEmailService = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
      verifyConnection: vi.fn().mockResolvedValue({ success: true, message: "OK" }),
    };

    const container = createContainer({
      userRepository: mockUserRepo,
      otpRepository: mockOtpRepo,
      emailService: mockEmailService,
    });

    app = createApp(container);
  });

  // 1. Valid signup with a working email configuration sends an OTP
  it("Scenario 1: Valid signup with a working email configuration sends an OTP", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "newuser@example.com",
        password: "Password123!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("OTP sent to email");
    expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendOtp).toHaveBeenCalledWith(
      "newuser@example.com",
      expect.stringMatching(/^\d{6}$/)
    );
  });

  // 2. An email-provider failure returns a meaningful error instead of falsely reporting successful delivery
  it("Scenario 2: Email-provider failure returns a meaningful error and does not report success", async () => {
    vi.mocked(mockEmailService.sendOtp).mockRejectedValueOnce(
      new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Failed to deliver verification email. Please check your email address or SMTP configuration."
      )
    );

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "fail_email@example.com",
        password: "Password123!",
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Failed to deliver verification email");
    // Ensure OTP was rolled back / deleted
    expect(inMemoryOtps.find((o) => o.email === "fail_email@example.com")).toBeUndefined();
  });

  // 3. Invalid email or password is handled correctly
  it("Scenario 3: Invalid email or password returns 400 validation error", async () => {
    const resShortPass = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test",
        email: "valid@example.com",
        password: "123", // too short (<6)
      });

    expect(resShortPass.status).toBe(400);
    expect(resShortPass.body.success).toBe(false);

    const resBadEmail = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test",
        email: "not-an-email",
        password: "Password123!",
      });

    expect(resBadEmail.status).toBe(400);
    expect(resBadEmail.body.success).toBe(false);
  });

  // 4. OTP verification accepts a valid, unexpired OTP
  it("Scenario 4: OTP verification accepts a valid, unexpired OTP and creates account", async () => {
    // Generate signup OTP
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
      });

    const sentOtpCode = vi.mocked(mockEmailService.sendOtp).mock.calls[0][1];

    const verifyRes = await request(app)
      .post("/api/auth/verify-otp")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
        code: sentOtpCode,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.message).toBe("Account verified and created");
    expect(verifyRes.body.data.email).toBe("jane@example.com");

    // Verify user exists in repository
    const createdUser = await mockUserRepo.findByEmail("jane@example.com");
    expect(createdUser).not.toBeNull();
    expect(createdUser?.name).toBe("Jane Doe");
  });

  // 5. Invalid or expired OTPs are rejected
  it("Scenario 5: Invalid or expired OTPs are rejected with 400", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
      });

    // Try with wrong OTP
    const wrongRes = await request(app)
      .post("/api/auth/verify-otp")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
        code: "999999",
      });

    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.success).toBe(false);
    expect(wrongRes.body.message).toBe("Invalid OTP");

    // Expire the OTP manually
    inMemoryOtps.forEach((o) => (o.expiresAt = new Date(Date.now() - 1000)));

    const sentOtpCode = vi.mocked(mockEmailService.sendOtp).mock.calls[0][1];
    const expiredRes = await request(app)
      .post("/api/auth/verify-otp")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
        code: sentOtpCode,
      });

    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.success).toBe(false);
    expect(expiredRes.body.message).toContain("expired");
  });

  // 6. Resending an OTP works and allows the newest OTP to be verified
  it("Scenario 6: Resending an OTP generates a new OTP and allows verification with the new code", async () => {
    // 1st attempt
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice",
        email: "alice@example.com",
        password: "Password123!",
      });

    // Resend OTP
    const resendRes = await request(app)
      .post("/api/auth/resend-otp")
      .send({
        email: "alice@example.com",
      });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.success).toBe(true);
    expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(2);

    const secondOtpCode = vi.mocked(mockEmailService.sendOtp).mock.calls[1][1];

    // Verify using second OTP code
    const verifyRes = await request(app)
      .post("/api/auth/verify-otp")
      .send({
        name: "Alice",
        email: "alice@example.com",
        password: "Password123!",
        code: secondOtpCode,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
  });

  // 7. Existing users and duplicate-email handling continue to work
  it("Scenario 7: Duplicate email registration returns 409 Conflict", async () => {
    // Add pre-existing user
    inMemoryUsers.push({
      id: "u-existing",
      name: "Existing User",
      email: "existing@example.com",
      password: await bcrypt.hash("Password123!", 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Duplicate User",
        email: "existing@example.com",
        password: "Password123!",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("already exists");
    expect(mockEmailService.sendOtp).not.toHaveBeenCalled();
  });
});
