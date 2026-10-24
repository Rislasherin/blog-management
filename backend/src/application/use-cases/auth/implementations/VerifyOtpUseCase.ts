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

    const otp = await this.otpRepository.findValid(email, OtpPurpose.SIGNUP);
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
