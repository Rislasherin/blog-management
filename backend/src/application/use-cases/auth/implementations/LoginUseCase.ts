import type { IUserRepository } from "../../../../domain/repositories/IUserRepository.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { ITokenService } from "../../../interfaces/ITokenService.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { LoginDTO } from "../../../dtos/auth.dto.js";
import type { ILoginUseCase, LoginResponseDTO } from "../interfaces/ILoginUseCase.js";

export class LoginUseCase implements ILoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResponseDTO> {
    const { email, password } = dto;
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.password) {
      throw new AppError(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    if (!password) {
      throw new AppError(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const isValid = await this.passwordHasher.compare(password, user.password);
    if (!isValid) {
      throw new AppError(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const userId = (user.id || user._id)?.toString() ?? "";
    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      email: user.email,
    });

    return {
      user: {
        id: userId,
        name: user.name,
        email: user.email,
      },
      accessToken,
    };
  }
}

export default LoginUseCase;
