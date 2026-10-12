import User from "./user.model.js";
import type { IUser } from "./types/user.types.js";

class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async create(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUser> {
    return User.create(userData);
  }
}

export default new UserRepository();