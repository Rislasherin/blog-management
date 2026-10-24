import type { IUser, User } from "../entities/User.js";

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | User | null>;
  findById(id: string): Promise<IUser | User | null>;
  create(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUser | User>;
  updatePassword(email: string, password: string): Promise<IUser | User | null>;
}

export default IUserRepository;
