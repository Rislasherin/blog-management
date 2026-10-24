import { Schema, model, type Document } from "mongoose";

export interface IPostDocument extends Document {
  title: string;
  subtitle?: string | null;
  content: string;
  imageUrl?: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPostDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ createdAt: -1 });

export const PostModel = model<IPostDocument>("Post", postSchema);
export default PostModel;
