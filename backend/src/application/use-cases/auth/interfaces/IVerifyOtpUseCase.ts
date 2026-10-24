import type { VerifyOtpDTO } from "../../../dtos/auth.dto.js";

export interface VerifyOtpResponseDTO {
  id: string;
  name: string;
  email: string;
}

export interface IVerifyOtpUseCase {
  execute(dto: VerifyOtpDTO): Promise<VerifyOtpResponseDTO>;
}

export default IVerifyOtpUseCase;
