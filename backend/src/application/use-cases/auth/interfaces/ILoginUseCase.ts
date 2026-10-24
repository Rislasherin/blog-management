import type { LoginDTO } from "../../../dtos/auth.dto.js";

export interface LoginResponseDTO {
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;
}

export interface ILoginUseCase {
  execute(dto: LoginDTO): Promise<LoginResponseDTO>;
}

export default ILoginUseCase;
