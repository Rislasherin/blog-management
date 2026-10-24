import type { ResendOtpDTO } from "../../../dtos/auth.dto.js";

export interface ResendOtpResponseDTO {
  success: boolean;
  message: string;
}

export interface IResendOtpUseCase {
  execute(dto: ResendOtpDTO): Promise<ResendOtpResponseDTO>;
}

export default IResendOtpUseCase;
