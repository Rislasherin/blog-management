import type { IUserRepository } from "../../../../domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../../../domain/repositories/IOtpRepository.js";
import { OtpPurpose } from "../../../../domain/enums/OtpPurpose.enum.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { IEmailService } from "../../../interfaces/IEmailService.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { ResendOtpDTO } from "../../../dtos/auth.dto.js";
import type { IResendOtpUseCase, ResendOtpResponseDTO } from "../interfaces/IResendOtpUseCase.js";

export class ResendOtpUseCase implements IResendOtpUseCase {
  private readonly cooldownMs: number;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly emailService: IEmailService,
    private readonly passwordHasher: IPasswordHasher,
    cooldownMs?: number
  ) {
    this.cooldownMs =
      cooldownMs !== undefined
        ? cooldownMs
        : (process.env.OTP_RESEND_COOLDOWN_MS !== undefined
            ? Number(process.env.OTP_RESEND_COOLDOWN_MS)
            : (process.env.NODE_ENV === "test" ? 0 : 60000));
  }

  async execute(dto: ResendOtpDTO): Promise<ResendOtpResponseDTO> {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(HttpStatus.CONFLICT, "User already registered and verified");
    }

    if (this.cooldownMs > 0) {
      const existingOtp = await this.otpRepository.findValid(email, OtpPurpose.SIGNUP);
      if (existingOtp && existingOtp.createdAt) {
        const elapsedMs = Date.now() - new Date(existingOtp.createdAt).getTime();
        if (elapsedMs < this.cooldownMs) {
          const remainingSeconds = Math.max(1, Math.ceil((this.cooldownMs - elapsedMs) / 1000));
          throw new AppError(
            HttpStatus.TOO_MANY_REQUESTS,
            `Please wait ${remainingSeconds} seconds before requesting a new verification code`
          );
        }
      }
    }

    if (typeof this.otpRepository.deleteMany === "function") {
      await this.otpRepository.deleteMany({ email, purpose: OtpPurpose.SIGNUP }).catch(() => {});
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await this.passwordHasher.hash(code, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otp = await this.otpRepository.create({
      email,
      purpose: OtpPurpose.SIGNUP,
      codeHash,
      expiresAt,
    });

    try {
      await this.emailService.sendOtp(email, code);
    } catch (error) {
      const otpId = otp.id || otp._id;
      if (otpId) {
        if (typeof this.otpRepository.deleteById === "function") {
          await this.otpRepository.deleteById(String(otpId)).catch(() => {});
        } else if (typeof this.otpRepository.deleteMany === "function") {
          await this.otpRepository.deleteMany({ _id: otpId }).catch(() => {});
        }
      }
      throw error;
    }

    return { success: true, message: "OTP resent to email successfully" };
  }
}

export default ResendOtpUseCase;
