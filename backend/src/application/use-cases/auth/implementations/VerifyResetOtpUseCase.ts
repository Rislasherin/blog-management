import type { IOtpRepository } from "../../../../domain/repositories/IOtpRepository.js";
import { OtpPurpose } from "../../../../domain/enums/OtpPurpose.enum.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { ITokenService } from "../../../interfaces/ITokenService.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { VerifyResetOtpDTO } from "../../../dtos/auth.dto.js";
import type { IVerifyResetOtpUseCase, VerifyResetOtpResponseDTO } from "../interfaces/IVerifyResetOtpUseCase.js";

export class VerifyResetOtpUseCase implements IVerifyResetOtpUseCase {
  constructor(
    private readonly otpRepository: IOtpRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(emailOrDto: string | VerifyResetOtpDTO, codeParam?: string): Promise<VerifyResetOtpResponseDTO> {
    const rawEmail = typeof emailOrDto === "string" ? emailOrDto : emailOrDto.email;
    const email = (rawEmail || "").toLowerCase().trim();
    const rawCode = typeof emailOrDto === "string" ? (codeParam || "") : (emailOrDto.otp || (emailOrDto as { code?: string }).code || "");
    const code = (rawCode || "").trim();

    const otp = await this.otpRepository.findValid(email, OtpPurpose.RESET);
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

    const resetToken = this.tokenService.generateAccessToken({
      sub: email,
      email,
    });

    return {
      success: true,
      message: "OTP verified successfully",
      resetToken,
    };
  }
}

export default VerifyResetOtpUseCase;
