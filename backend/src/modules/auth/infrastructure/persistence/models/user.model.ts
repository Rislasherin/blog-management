import mongoose, { Model, model } from "mongoose";
import { userSchema } from "../schemas/user.schema.js";
import type { IUser } from "../../../domain/entities/user.entity.js";

export const UserModel: Model<IUser> =
  mongoose.models.User || model<IUser>("User", userSchema);

export default UserModel;
