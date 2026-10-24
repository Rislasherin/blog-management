import { UserModel } from "../models/UserModel.js";
import { UserMapper } from "../mappers/UserMapper.js";
import type { User } from "../../../domain/entities/User.js";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository.js";

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email }).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async create(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const doc = await UserModel.create(userData);
    return UserMapper.toDomain(doc);
  }

  async updatePassword(email: string, password: string): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate(
      { email },
      { $set: { password } },
      { new: true }
    ).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }
}

export default MongoUserRepository;
