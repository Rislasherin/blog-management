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
} from "./auth.types.js";
import { MongoOtpRepository } from "./otp.repository.js";
import { EmailService } from "./email.service.js";
import { AppError } from "../../shared/errors/AppError.js";

export class AuthService {
  private readonly otpRepository: IOtpRepository;
  private readonly emailService: EmailService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    otpRepository?: IOtpRepository,
    emailService?: EmailService
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

    await this.otpRepository.create({
      email,
      purpose: "signup" as OtpPurpose,
      codeHash,
      expiresAt,
    });

    await this.emailService.sendOtp(email, code);
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
}

export default AuthService;