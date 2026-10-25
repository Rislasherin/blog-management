import type { IUserRepository } from "../../../../domain/repositories/IUserRepository.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { ITokenService } from "../../../interfaces/ITokenService.js";
import type { IPasswordHasher } from "../../../interfaces/IPasswordHasher.js";
import type { LoginDTO } from "../../../dtos/auth.dto.js";
import type { ILoginUseCase, LoginResponseDTO } from "../interfaces/ILoginUseCase.js";

// Static valid bcrypt hash (cost 12) used to equalize timing when user is not found
const DUMMY_HASH = "$2a$12$e80yqZ6V6XwE40gW3VlM2O6yA6E7e0h.GkJb6l1N2Q4p5S6u7V8w9";

export class LoginUseCase implements ILoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResponseDTO> {
    const email = (dto.email || "").toLowerCase().trim();
    const password = dto.password || "";

    if (!email || !password) {
      throw new AppError(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.password) {
      // Execute dummy compare to prevent timing-based user enumeration
      await this.passwordHasher.compare(password, DUMMY_HASH);
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
