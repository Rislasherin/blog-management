import type { IUserRepository } from "../../../../domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../../../domain/repositories/IOtpRepository.js";
import { OtpPurpose } from "../../../../domain/enums/OtpPurpose.enum.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { IEmailService } from "../../../interfaces/IEmailService.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { RegisterUserDTO, RegisterUserResponseDTO } from "../../../dtos/auth.dto.js";
import type { IRegisterUserUseCase } from "../interfaces/IRegisterUserUseCase.js";

export class RegisterUserUseCase implements IRegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly emailService: IEmailService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO): Promise<RegisterUserResponseDTO> {
    const { email } = dto;
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(HttpStatus.CONFLICT, "User already exists with this email");
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

    return { success: true, message: "OTP sent to email" };
  }
}

export default RegisterUserUseCase;
