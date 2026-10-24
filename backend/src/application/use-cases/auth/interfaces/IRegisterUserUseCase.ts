import type { RegisterUserDTO, RegisterUserResponseDTO } from "../../../dtos/auth.dto.js";

export interface IRegisterUserUseCase {
  execute(dto: RegisterUserDTO): Promise<RegisterUserResponseDTO>;
}

export default IRegisterUserUseCase;
