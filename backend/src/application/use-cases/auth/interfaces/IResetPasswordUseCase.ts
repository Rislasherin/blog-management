import type { ResetPasswordDTO, ResetPasswordResponseDTO } from "../../../dtos/auth.dto.js";

export type { ResetPasswordResponseDTO };

export interface IResetPasswordUseCase {
  execute(dto: ResetPasswordDTO): Promise<ResetPasswordResponseDTO>;
}

export default IResetPasswordUseCase;
