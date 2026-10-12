import { UserModel } from "../models/user.model.js";
import type { IUser } from "../../../domain/entities/user.entity.js";
import type { IUserRepository } from "../../../domain/repositories/user.repository.interface.js";

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
}

export default MongoUserRepository;
