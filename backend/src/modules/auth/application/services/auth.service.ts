import bcrypt from "bcryptjs";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface.js";
import type { ITokenService } from "../../domain/services/token.service.interface.js";
import type { RegisterDTO, LoginDTO, LoginResponseDTO } from "../dto/auth.dto.js";
import type { IOtpRepository, OtpPurpose } from "../../domain/repositories/otp.repository.interface.js";
import { EmailService } from "../../infrastructure/services/email.service.js";
import { MongoOtpRepository } from "../../infrastructure/persistence/repositories/mongo-otp.repository.js";

import { AppError } from "../../../../shared/errors/AppError.js";

export class AuthService {
  private readonly otpRepository: IOtpRepository;
  private readonly emailService: EmailService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    otpRepository?: IOtpRepository,
    emailService?: EmailService,
  ) {
    this.otpRepository = otpRepository ?? new MongoOtpRepository();
    this.emailService = emailService ?? new EmailService();
  }

  // ---- Signup with OTP ----
  /**
   * Initiates a signup by generating an OTP and sending it via email.
   * Returns a generic success response; the actual user is created after OTP verification.
   */
  async initiateSignup(name: string, email: string, password: string) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, "User already exists with this email");
    }
    // Generate a 6‑digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.otpRepository.create({
      email,
      purpose: "signup" as OtpPurpose,
      codeHash,
      expiresAt,
    });
    await this.emailService.sendOtp(email, code);
    return { success: true, message: "OTP sent to email" };
  }

  /** Verify the OTP for signup and create the user account. */
  async verifySignupOtp(email: string, code: string, name: string, password: string) {
    const otp = await this.otpRepository.findValid(email, "signup" as OtpPurpose);
    if (!otp) {
      throw new AppError(400, "Invalid or expired OTP");
    }
    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await this.otpRepository.incrementAttempts(otp._id?.toString() ?? "");
      throw new AppError(400, "Invalid OTP");
    }
    await this.otpRepository.markAsUsed(otp._id?.toString() ?? "");
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.userRepository.create({ name, email, password: hashedPassword });
    return { _id: user._id, name: user.name, email: user.email };
  }

  // Compatibility wrappers for existing DTO‑based endpoints
  async register(dto: RegisterDTO) {
    // Frontend calls register => start OTP flow
    return this.initiateSignup(dto.name, dto.email, dto.password);
  }

  async verifyOtp(dto: { email: string; code: string; name: string; password: string }) {
    return this.verifySignupOtp(dto.email, dto.code, dto.name, dto.password);
  }

  // ---- Login (unchanged) ----
  async login(email: string, password: string): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user._id) {
      throw new AppError(401, "Invalid email or password");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }
    const accessToken = this.tokenService.generateAccessToken({
      sub: user._id.toString(),
      email: user.email,
    });
    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
    };
  }

  async loginDto(dto: LoginDTO): Promise<LoginResponseDTO> {
    return this.login(dto.email, dto.password);
  }
}
