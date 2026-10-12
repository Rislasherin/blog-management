import { model, Document, Types } from "mongoose";
import { postSchema } from "../schemas/post.schema.js";

export interface IPostDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string | null;
  content: string;
  imageUrl: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PostModel = model<IPostDocument>("Post", postSchema);
