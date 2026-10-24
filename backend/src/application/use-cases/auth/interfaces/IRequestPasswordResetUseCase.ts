import type { RequestPasswordResetDTO, RequestPasswordResetResponseDTO } from "../../../dtos/auth.dto.js";

export type { RequestPasswordResetResponseDTO };

export interface IRequestPasswordResetUseCase {
  execute(emailOrDto: string | RequestPasswordResetDTO): Promise<RequestPasswordResetResponseDTO>;
}

export default IRequestPasswordResetUseCase;
