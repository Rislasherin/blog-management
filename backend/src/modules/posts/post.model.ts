import mongoose, { Schema, Document, Types, Model, model } from "mongoose";

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

export const postSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: null, trim: true },
    content: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
    authorId: { type: String, required: true },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 }, { name: "createdAt_desc" });
postSchema.index({ authorId: 1, createdAt: -1 }, { name: "authorId_createdAt_desc" });

export const PostModel: Model<IPostDocument> =
  mongoose.models.Post || model<IPostDocument>("Post", postSchema);

export default PostModel;
