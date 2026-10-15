import { UserModel } from "./user.model.js";
import type { IUser, IUserRepository } from "./auth.types.js";

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email }).exec();
  }

  async create(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUser> {
    return UserModel.create(userData);
  }

  async updatePassword(email: string, password: string): Promise<IUser | null> {
    return UserModel.findOneAndUpdate(
      { email },
      { $set: { password } },
      { new: true }
    ).exec();
  }
}

export default MongoUserRepository;
