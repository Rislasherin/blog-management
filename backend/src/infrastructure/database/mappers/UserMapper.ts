import type { IUserDocument } from "../models/UserModel.js";
import { User, type IUser } from "../../../domain/entities/User.js";

export class UserMapper {
  static toDomain(raw: IUserDocument | IUser): User {
    const rawAny = raw as { _id?: unknown; id?: string };
    const id = rawAny._id ? String(rawAny._id) : (rawAny.id ?? "");
    return new User({
      id,
      _id: id,
      name: raw.name,
      email: raw.email,
      password: raw.password,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User | IUser): Partial<IUserDocument> {
    const persistenceObj: Partial<IUserDocument> = {
      name: user.name,
      email: user.email,
    };
    if (user.password !== undefined) {
      persistenceObj.password = user.password;
    }
    return persistenceObj;
  }
}

export default UserMapper;
