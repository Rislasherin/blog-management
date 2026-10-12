import bcrypt from "bcryptjs";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface.js";
import type { ITokenService } from "../../domain/services/token.service.interface.js";
import type { RegisterDTO, LoginDTO, LoginResponseDTO } from "../dto/auth.dto.js";
import { AppError } from "../../../../shared/errors/AppError.js";

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async Register(name: string, email: string, password: string) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, "User already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.userRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
  }

  async register(dto: RegisterDTO) {
    return this.Register(dto.name, dto.email, dto.password);
  }

  async Login(email: string, password: string): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user._id) {
      throw new AppError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user._id.toString(),
      email: user.email,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
    };
  }

  async login(dto: LoginDTO): Promise<LoginResponseDTO> {
    return this.Login(dto.email, dto.password);
  }
}
