import mongoose, { Schema, Document, Model, model } from "mongoose";
import type { IUser } from "./auth.types.js";

export const userSchema = new Schema<IUser & Document>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || model<IUser>("User", userSchema);

export default UserModel;