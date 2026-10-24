import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../application/interfaces/IPasswordHasher.js";

export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly defaultSaltRounds: number;

  constructor(defaultSaltRounds: number = 12) {
    this.defaultSaltRounds = defaultSaltRounds;
  }

  async hash(plain: string, saltRounds?: number): Promise<string> {
    const rounds = saltRounds ?? this.defaultSaltRounds;
    return bcrypt.hash(plain, rounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

export default BcryptPasswordHasher;
