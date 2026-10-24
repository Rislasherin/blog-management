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
    const email = typeof emailOrDto === "string" ? emailOrDto : emailOrDto.email;
    const code = typeof emailOrDto === "string" ? (codeParam || "") : (emailOrDto.otp || (emailOrDto as { code?: string }).code || "");

    const otp = await this.otpRepository.findValid(email, OtpPurpose.RESET);
    if (!otp) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Invalid or expired OTP");
    }

    const isValid = await this.passwordHasher.compare(code, otp.codeHash);
    const otpId = (otp.id || otp._id)?.toString() ?? "";
    if (!isValid) {
      if (otpId) {
        await this.otpRepository.incrementAttempts(otpId);
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
