import { Schema, Document } from "mongoose";
import type { IUser } from "../../../domain/entities/user.entity.js";

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

export default userSchema;
