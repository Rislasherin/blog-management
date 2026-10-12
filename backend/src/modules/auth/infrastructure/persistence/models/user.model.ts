import mongoose, { type Model } from "mongoose";
import { userSchema } from "../schemas/user.schema.js";
import type { IUser } from "../../../domain/entities/user.entity.js";

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default UserModel;
