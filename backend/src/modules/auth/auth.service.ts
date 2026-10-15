import bcrypt from "bcryptjs";
import type {
  IUserRepository,
  ITokenService,
  IOtpRepository,
  OtpPurpose,
  RegisterDTO,
  LoginDTO,
  LoginResponseDTO,
  VerifyOtpDTO,
  ResetPasswordDTO,
  IAuthService,
  IEmailService,
} from "./auth.types.js";
import { MongoOtpRepository } from "./otp.repository.js";
import { EmailService } from "./email.service.js";
import { AppError } from "../../shared/errors/AppError.js";

export class AuthService implements IAuthService {
  private readonly otpRepository: IOtpRepository;
  private readonly emailService: IEmailService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    otpRepository?: IOtpRepository,
    emailService?: IEmailService
  ) {
    this.otpRepository = otpRepository ?? new MongoOtpRepository();
    this.emailService = emailService ?? new EmailService();
  }

  /**
   * Initiates signup by generating a 6-digit OTP, storing its bcrypt hash,
   * and emailing it to the user. Account is created only after OTP verification.
   */
  async initiateSignup(name: string, email: string, password: string) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, "User already exists with this email");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otp = await this.otpRepository.create({
      email,
      purpose: "signup" as OtpPurpose,
      codeHash,
      expiresAt,
    });

    try {
      await this.emailService.sendOtp(email, code);
    } catch (error) {
      if (otp?._id) {
        await this.otpRepository.deleteMany({ _id: otp._id }).catch(() => {});
      }
      throw error;
    }

    return { success: true, message: "OTP sent to email" };
  }

  /**
   * Verifies the OTP and creates the user account upon success.
   */
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

    return {
      id: user._id?.toString(),
      name: user.name,
      email: user.email,
    };
  }

  async register(dto: RegisterDTO) {
    return this.initiateSignup(dto.name, dto.email, dto.password);
  }

  async verifyOtp(dto: VerifyOtpDTO) {
    return this.verifySignupOtp(dto.email, dto.code, dto.name, dto.password);
  }

  async login(email: string, password: string): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user._id || !user.password) {
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

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, "User not found with this email");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otp = await this.otpRepository.create({
      email,
      purpose: "reset" as OtpPurpose,
      codeHash,
      expiresAt,
    });

    try {
      await this.emailService.sendOtp(email, code);
    } catch (error) {
      if (otp?._id) {
        await this.otpRepository.deleteMany({ _id: otp._id }).catch(() => {});
      }
      throw error;
    }

    return { success: true, message: "Password reset code sent to your email" };
  }

  async verifyResetOtp(email: string, code: string) {
    const otp = await this.otpRepository.findValid(email, "reset" as OtpPurpose);
    if (!otp) {
      throw new AppError(400, "Invalid or expired reset code");
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await this.otpRepository.incrementAttempts(otp._id?.toString() ?? "");
      throw new AppError(400, "Invalid reset code");
    }

    const resetToken = this.tokenService.generateAccessToken({
      sub: email,
      email,
    });

    return {
      success: true,
      message: "Reset code verified successfully",
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDTO) {
    const email = dto.email;

    if (dto.resetToken) {
      try {
        const payload = this.tokenService.verifyAccessToken(dto.resetToken);
        if (payload.email !== dto.email) {
          throw new AppError(400, "Invalid reset token for this email");
        }
      } catch {
        throw new AppError(400, "Invalid or expired reset token");
      }
    } else if (dto.code) {
      const otp = await this.otpRepository.findValid(email, "reset" as OtpPurpose);
      if (!otp) {
        throw new AppError(400, "Invalid or expired reset code");
      }
      const isValid = await bcrypt.compare(dto.code, otp.codeHash);
      if (!isValid) {
        await this.otpRepository.incrementAttempts(otp._id?.toString() ?? "");
        throw new AppError(400, "Invalid reset code");
      }
      await this.otpRepository.markAsUsed(otp._id?.toString() ?? "");
    } else {
      throw new AppError(400, "Verification code or reset token is required");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, "User not found with this email");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    await this.userRepository.updatePassword(email, hashedPassword);

    return { success: true, message: "Password reset successfully. You can now sign in." };
  }
}

export default AuthService;