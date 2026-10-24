import type { VerifyResetOtpDTO, VerifyResetOtpResponseDTO } from "../../../dtos/auth.dto.js";

export type { VerifyResetOtpResponseDTO };

export interface IVerifyResetOtpUseCase {
  execute(emailOrDto: string | VerifyResetOtpDTO, codeParam?: string): Promise<VerifyResetOtpResponseDTO>;
}

export default IVerifyResetOtpUseCase;
