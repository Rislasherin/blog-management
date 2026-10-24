import type { IPostDocument } from "../models/PostModel.js";
import { Post, type IPost } from "../../../domain/entities/Post.js";

export class PostMapper {
  static toDomain(raw: IPostDocument | IPost): Post {
    const rawAny = raw as { _id?: unknown; id?: string };
    const id = rawAny._id ? String(rawAny._id) : (rawAny.id ?? "");
    return new Post({
      id,
      _id: id,
      title: raw.title,
      subtitle: raw.subtitle ?? null,
      content: raw.content,
      imageUrl: raw.imageUrl ?? null,
      authorId: raw.authorId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(post: Post | IPost): Partial<IPostDocument> {
    return {
      title: post.title,
      subtitle: post.subtitle,
      content: post.content,
      imageUrl: post.imageUrl,
      authorId: post.authorId,
    };
  }
}

export default PostMapper;
