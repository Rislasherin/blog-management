import type { IUserRepository } from "../../../../domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../../../domain/repositories/IOtpRepository.js";
import { OtpPurpose } from "../../../../domain/enums/OtpPurpose.enum.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { ITokenService } from "../../../interfaces/ITokenService.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { ResetPasswordDTO } from "../../../dtos/auth.dto.js";
import type { IResetPasswordUseCase, ResetPasswordResponseDTO } from "../interfaces/IResetPasswordUseCase.js";

export class ResetPasswordUseCase implements IResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<ResetPasswordResponseDTO> {
    const rawToken = dto.token || dto.resetToken;
    let email = dto.email;

    if (rawToken) {
      try {
        const payload = this.tokenService.verifyAccessToken(rawToken);
        if (dto.email && payload.email !== dto.email) {
          throw new AppError(HttpStatus.BAD_REQUEST, "Invalid reset token for this email");
        }
        email = payload.email;
      } catch {
        throw new AppError(HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
      }
    } else if (dto.code && email) {
      const otp = await this.otpRepository.findValid(email, OtpPurpose.RESET);
      if (!otp) {
        throw new AppError(HttpStatus.BAD_REQUEST, "Invalid or expired reset code");
      }
      const isValid = await this.passwordHasher.compare(dto.code, otp.codeHash);
      const otpId = (otp.id || otp._id)?.toString() ?? "";
      if (!isValid) {
        if (otpId) {
          await this.otpRepository.incrementAttempts(otpId);
        }
        throw new AppError(HttpStatus.BAD_REQUEST, "Invalid reset code");
      }
      if (otpId) {
        await this.otpRepository.markAsUsed(otpId);
      }
    } else {
      throw new AppError(HttpStatus.BAD_REQUEST, "Verification code or reset token is required");
    }

    if (!email) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Email not found in token");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, "User not found with this email");
    }

    const newPassword = dto.newPassword || dto.password || "";
    if (!newPassword) {
      throw new AppError(HttpStatus.BAD_REQUEST, "New password is required");
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword, 12);
    await this.userRepository.updatePassword(email, hashedPassword);

    return { success: true, message: "Password reset successfully. You can now sign in." };
  }
}

export default ResetPasswordUseCase;
