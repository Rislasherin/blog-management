import type { IUserRepository } from "../../../../domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../../../domain/repositories/IOtpRepository.js";
import { OtpPurpose } from "../../../../domain/enums/OtpPurpose.enum.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { VerifyOtpDTO } from "../../../dtos/auth.dto.js";
import type { IVerifyOtpUseCase, VerifyOtpResponseDTO } from "../interfaces/IVerifyOtpUseCase.js";

export class VerifyOtpUseCase implements IVerifyOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: VerifyOtpDTO): Promise<VerifyOtpResponseDTO> {
    const email = dto.email.toLowerCase().trim();
    const code = (dto.otp || (dto as { code?: string }).code || "").trim();
    const name = (dto.name || "").trim();
    const password = dto.password || "";

    if (!name) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Name is required");
    }
    if (!password) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Password is required");
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(HttpStatus.CONFLICT, "User already exists with this email");
    }

    const otp = await this.otpRepository.findValid(email, OtpPurpose.SIGNUP);
    if (!otp) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Invalid or expired OTP");
    }

    const otpId = (otp.id || otp._id)?.toString() ?? "";

    if ((otp.attempts ?? 0) >= 5) {
      if (otpId) {
        await this.otpRepository.markAsUsed(otpId);
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        "Too many failed attempts. This verification code is no longer valid. Please request a new code."
      );
    }

    const isValid = await this.passwordHasher.compare(code, otp.codeHash);
    if (!isValid) {
      if (otpId) {
        const updatedOtp = await this.otpRepository.incrementAttempts(otpId);
        const currentAttempts = updatedOtp ? (updatedOtp.attempts ?? 0) : (otp.attempts + 1);
        if (currentAttempts >= 5) {
          await this.otpRepository.markAsUsed(otpId);
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            "Too many failed attempts. This verification code is no longer valid. Please request a new code."
          );
        }
      }
      throw new AppError(HttpStatus.BAD_REQUEST, "Invalid OTP");
    }

    if (otpId) {
      await this.otpRepository.markAsUsed(otpId);
    }
    const hashedPassword = await this.passwordHasher.hash(password, 12);
    const user = await this.userRepository.create({ name, email, password: hashedPassword });

    const userId = (user.id || user._id)?.toString() ?? "";

    return {
      id: userId,
      name: user.name,
      email: user.email,
    };
  }
}

export default VerifyOtpUseCase;
