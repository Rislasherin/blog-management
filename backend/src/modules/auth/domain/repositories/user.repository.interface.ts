import type { IUser } from "../entities/user.entity.js";

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  create(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUser>;
}
