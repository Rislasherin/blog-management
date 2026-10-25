import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createContainer } from "../../src/infrastructure/di/container.js";
import { AppError } from "../../src/domain/errors/AppError.js";
import { HttpStatus } from "../../src/domain/enums/HttpStatus.enum.js";
import { OtpPurpose } from "../../src/domain/enums/OtpPurpose.enum.js";
import type { IUserRepository } from "../../src/domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../src/domain/repositories/IOtpRepository.js";
import type { IEmailService } from "../../src/application/interfaces/IEmailService.js";
import type { IPasswordHasher } from "../../src/application/interfaces/IPasswordHasher.js";
import type { IUser } from "../../src/domain/entities/User.js";
import type { IOtp } from "../../src/domain/entities/Otp.js";
import { BcryptPasswordHasher } from "../../src/infrastructure/security/BcryptPasswordHasher.js";

describe("Complete Signup and Login Validation Audit Tests", () => {
  let inMemoryUsers: IUser[];
  let inMemoryOtps: IOtp[];
  let mockUserRepo: IUserRepository;
  let mockOtpRepo: IOtpRepository;
  let mockEmailService: IEmailService;
  let passwordHasher: IPasswordHasher;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    inMemoryUsers = [];
    inMemoryOtps = [];
    passwordHasher = new BcryptPasswordHasher();

    mockUserRepo = {
      findByEmail: vi.fn(async (email: string) => {
        return (
          inMemoryUsers.find(
            (u) => u.email.toLowerCase() === email.toLowerCase().trim()
          ) || null
        );
      }),
      findById: vi.fn(async (id: string) => {
        return inMemoryUsers.find((u) => u.id === id) || null;
      }),
      create: vi.fn(
        async (data: { name: string; email: string; password?: string }) => {
          const user: IUser = {
            id: `u-${Date.now()}-${Math.random()}`,
            name: data.name,
            email: data.email.toLowerCase().trim(),
            password: data.password || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          inMemoryUsers.push(user);
          return user;
        }
      ),
      updatePassword: vi.fn(),
    } as unknown as IUserRepository;

    mockOtpRepo = {
      create: vi.fn(
        async (data: {
          email: string;
          purpose: any;
          codeHash: string;
          expiresAt: Date;
        }) => {
          const otp: IOtp = {
            id: `otp-${Date.now()}-${Math.random()}`,
            email: data.email.toLowerCase().trim(),
            purpose: data.purpose,
            codeHash: data.codeHash,
            expiresAt: data.expiresAt,
            used: false,
            attempts: 0,
            createdAt: new Date(),
          };
          inMemoryOtps.push(otp);
          return otp;
        }
      ),
      findValid: vi.fn(async (email: string, purpose: any) => {
        const now = new Date();
        const valid = inMemoryOtps
          .filter(
            (o) =>
              o.email.toLowerCase() === email.toLowerCase().trim() &&
              o.purpose === purpose &&
              !o.used &&
              new Date(o.expiresAt) > now
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
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
      deleteMany: vi.fn(
        async (filter: { email?: string; purpose?: any; _id?: any }) => {
          const initial = inMemoryOtps.length;
          inMemoryOtps = inMemoryOtps.filter(
            (o) =>
              (filter.email &&
                o.email.toLowerCase() !== filter.email.toLowerCase()) ||
              (filter.purpose && o.purpose !== filter.purpose)
          );
          return initial - inMemoryOtps.length;
        }
      ),
    };

    mockEmailService = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
      verifyConnection: vi.fn().mockResolvedValue({ success: true, message: "OK" }),
    };

    const container = createContainer({
      userRepository: mockUserRepo,
      otpRepository: mockOtpRepo,
      emailService: mockEmailService,
      passwordHasher,
    });

    app = createApp(container);
  });

  /* -------------------------------------------------------------------------
   * 1. SIGNUP VALIDATION & FLOW TESTS
   * ------------------------------------------------------------------------- */
  describe("Signup Validation & Flow", () => {
    it("should accept valid registration and dispatch 6-digit OTP", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Smith",
        email: "alice.smith@example.com",
        password: "SuperSecretPassword123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockEmailService.sendOtp).toHaveBeenCalledWith(
        "alice.smith@example.com",
        expect.stringMatching(/^\d{6}$/)
      );
      // Ensure secrets are never exposed in response
      expect(res.body.otp).toBeUndefined();
      expect(res.body.codeHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it("should reject missing required fields with 400 and field-level errors", async () => {
      const res = await request(app).post("/api/auth/register").send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.name).toBeDefined();
      expect(res.body.errors.email).toBeDefined();
      expect(res.body.errors.password).toBeDefined();
    });

    it("should reject whitespace-only name with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "      ",
        email: "alice@example.com",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.name).toBeDefined();
    });

    it("should reject whitespace-only email with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Smith",
        email: "     ",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.email).toBeDefined();
    });

    it("should reject invalid email format with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Smith",
        email: "not-an-email",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.email).toBeDefined();
    });

    it("should reject password shorter than 8 characters with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Smith",
        email: "alice@example.com",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.password).toBeDefined();
    });

    it("should reject password longer than 128 characters with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Smith",
        email: "alice@example.com",
        password: "P".repeat(129),
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.password).toBeDefined();
    });

    it("should reject non-string types for fields with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: 12345,
        email: ["alice@example.com"],
        password: { pass: "secret" },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject malformed JSON with 400 Bad Request instead of 500", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send("{ malformed json: not valid }");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid JSON payload");
    });

    it("should reject duplicate email registration with 409 Conflict", async () => {
      inMemoryUsers.push({
        id: "u-existing",
        name: "Existing User",
        email: "existing@example.com",
        password: "hashedpassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Another User",
        email: "Existing@Example.com", // case variation test
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User already exists with this email");
    });

    it("should handle MongoDB duplicate key error (code 11000) gracefully with 409", async () => {
      // Simulate race condition where findByEmail returned null but DB unique index threw 11000
      vi.mocked(mockOtpRepo.create).mockRejectedValueOnce({
        name: "MongoServerError",
        code: 11000,
        message: "E11000 duplicate key error collection: blog.users index: email_1 dup key",
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Concurrent User",
        email: "concurrent@example.com",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("An account with this email already exists");
    });
  });

  /* -------------------------------------------------------------------------
   * 2. OTP VERIFICATION & BRUTE-FORCE SECURITY TESTS
   * ------------------------------------------------------------------------- */
  describe("OTP Verification & Brute-force Security", () => {
    it("should verify valid OTP, hash password, and create user account", async () => {
      const code = "789012";
      const codeHash = await passwordHasher.hash(code, 12);
      inMemoryOtps.push({
        id: "otp-test-1",
        email: "verify@example.com",
        purpose: OtpPurpose.SIGNUP,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
        attempts: 0,
        createdAt: new Date(),
      });

      const res = await request(app).post("/api/auth/verify-otp").send({
        name: "Verify User",
        email: "verify@example.com",
        password: "NewPassword123!",
        otp: code,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Account verified and created");
      expect(res.body.data.email).toBe("verify@example.com");

      // Verify user was stored with hashed password (never plaintext)
      const created = inMemoryUsers.find((u) => u.email === "verify@example.com");
      expect(created).toBeDefined();
      expect(created?.password).not.toBe("NewPassword123!");
      const pwMatches = await passwordHasher.compare("NewPassword123!", created!.password!);
      expect(pwMatches).toBe(true);

      // Verify OTP is marked as used
      const otpInDb = inMemoryOtps.find((o) => o.id === "otp-test-1");
      expect(otpInDb?.used).toBe(true);
    });

    it("should reject expired OTP with 400", async () => {
      const codeHash = await passwordHasher.hash("123456", 12);
      inMemoryOtps.push({
        id: "otp-expired",
        email: "expired@example.com",
        purpose: OtpPurpose.SIGNUP,
        codeHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        used: false,
        attempts: 0,
        createdAt: new Date(Date.now() - 600000),
      });

      const res = await request(app).post("/api/auth/verify-otp").send({
        name: "Expired User",
        email: "expired@example.com",
        password: "NewPassword123!",
        otp: "123456",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid or expired OTP");
    });

    it("should reject already used OTP with 400", async () => {
      const codeHash = await passwordHasher.hash("123456", 12);
      inMemoryOtps.push({
        id: "otp-used",
        email: "used@example.com",
        purpose: OtpPurpose.SIGNUP,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: true, // Already used
        attempts: 1,
        createdAt: new Date(),
      });

      const res = await request(app).post("/api/auth/verify-otp").send({
        name: "Used User",
        email: "used@example.com",
        password: "NewPassword123!",
        otp: "123456",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid or expired OTP");
    });

    it("should lock out and invalidate OTP after 5 failed attempts (brute-force prevention)", async () => {
      const codeHash = await passwordHasher.hash("999999", 12);
      inMemoryOtps.push({
        id: "otp-brute-target",
        email: "brute@example.com",
        purpose: OtpPurpose.SIGNUP,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
        attempts: 0,
        createdAt: new Date(),
      });

      // Submit 4 incorrect attempts
      for (let i = 1; i <= 4; i++) {
        const res = await request(app).post("/api/auth/verify-otp").send({
          name: "Brute User",
          email: "brute@example.com",
          password: "NewPassword123!",
          otp: "000000",
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid OTP");
      }

      // 5th incorrect attempt reaches the limit
      const fifthRes = await request(app).post("/api/auth/verify-otp").send({
        name: "Brute User",
        email: "brute@example.com",
        password: "NewPassword123!",
        otp: "000000",
      });
      expect(fifthRes.status).toBe(400);
      expect(fifthRes.body.message).toMatch(/too many failed attempts/i);

      // Verify OTP is now marked as used/invalidated
      const otpInDb = inMemoryOtps.find((o) => o.id === "otp-brute-target");
      expect(otpInDb?.used).toBe(true);

      // Even if user now provides the CORRECT code, it is rejected
      const correctRes = await request(app).post("/api/auth/verify-otp").send({
        name: "Brute User",
        email: "brute@example.com",
        password: "NewPassword123!",
        otp: "999999",
      });
      expect(correctRes.status).toBe(400);
      expect(correctRes.body.message).toMatch(/invalid or expired otp|too many failed attempts/i);
    });

    it("should reject verify-otp if user with that email already exists", async () => {
      inMemoryUsers.push({
        id: "u-existing-verify",
        name: "Already Verified",
        email: "already@example.com",
        password: "hashedpassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app).post("/api/auth/verify-otp").send({
        name: "Already Verified",
        email: "already@example.com",
        password: "NewPassword123!",
        otp: "123456",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("User already exists with this email");
    });
  });

  /* -------------------------------------------------------------------------
   * 3. LOGIN VALIDATION & SESSION SECURITY TESTS
   * ------------------------------------------------------------------------- */
  describe("Login Validation & Session Security", () => {
    beforeEach(async () => {
      const hashedPassword = await passwordHasher.hash("ValidLoginPass123!", 12);
      inMemoryUsers.push({
        id: "u-valid-login",
        name: "Login User",
        email: "login.user@example.com",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should succeed with valid credentials and return access token without leaking password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "  Login.User@Example.COM  ",
        password: "ValidLoginPass123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe("string");
      expect(res.body.data.user.email).toBe("login.user@example.com");
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should reject missing email or password with 400", async () => {
      const res1 = await request(app).post("/api/auth/login").send({
        email: "login.user@example.com",
      });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post("/api/auth/login").send({
        password: "ValidLoginPass123!",
      });
      expect(res2.status).toBe(400);
    });

    it("should reject whitespace-only email with 400", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "   ",
        password: "ValidLoginPass123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject invalid email format with 400", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "not-a-valid-email",
        password: "ValidLoginPass123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return generic 401 for unknown email without user enumeration", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "AnyPassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should return generic 401 for incorrect password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login.user@example.com",
        password: "WrongPassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should reject unverified user who never completed OTP verification", async () => {
      // Unverified users do not exist in the users repository
      const res = await request(app).post("/api/auth/login").send({
        email: "pending.verification@example.com",
        password: "ValidLoginPass123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should handle unexpected database errors gracefully with 500 without stack trace leaks", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockRejectedValueOnce(
        new Error("Connection to replica set primary lost")
      );

      const res = await request(app).post("/api/auth/login").send({
        email: "login.user@example.com",
        password: "ValidLoginPass123!",
      });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Internal Server Error");
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/replica set/i);
    });
  });

  /* -------------------------------------------------------------------------
   * 4. OTP RESEND COOLDOWN TESTS
   * ------------------------------------------------------------------------- */
  describe("OTP Resend Cooldown", () => {
    it("should reject resend requests within the 60-second cooldown window with 429", async () => {
      // Create a test container with explicit 60,000ms cooldown
      const { ResendOtpUseCase } = await import(
        "../../src/application/use-cases/auth/implementations/ResendOtpUseCase.js"
      );
      const resendUseCaseWithCooldown = new ResendOtpUseCase(
        mockUserRepo,
        mockOtpRepo,
        mockEmailService,
        passwordHasher,
        60000 // 60s cooldown
      );

      // Existing OTP created 10 seconds ago
      inMemoryOtps.push({
        id: "otp-cooldown",
        email: "cooldown@example.com",
        purpose: OtpPurpose.SIGNUP,
        codeHash: "hash123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
        attempts: 0,
        createdAt: new Date(Date.now() - 10000), // 10s ago
      });

      await expect(
        resendUseCaseWithCooldown.execute({ email: "cooldown@example.com" })
      ).rejects.toThrowError(/please wait/i);
    });

    it("should allow resend when cooldown period has elapsed", async () => {
      const { ResendOtpUseCase } = await import(
        "../../src/application/use-cases/auth/implementations/ResendOtpUseCase.js"
      );
      const resendUseCaseWithCooldown = new ResendOtpUseCase(
        mockUserRepo,
        mockOtpRepo,
        mockEmailService,
        passwordHasher,
        60000 // 60s cooldown
      );

      // Existing OTP created 65 seconds ago (elapsed)
      inMemoryOtps.push({
        id: "otp-elapsed",
        email: "elapsed@example.com",
        purpose: OtpPurpose.SIGNUP,
        codeHash: "hash123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
        attempts: 0,
        createdAt: new Date(Date.now() - 65000),
      });

      const result = await resendUseCaseWithCooldown.execute({
        email: "elapsed@example.com",
      });
      expect(result.success).toBe(true);
      expect(mockEmailService.sendOtp).toHaveBeenCalledTimes(1);
    });
  });
});
