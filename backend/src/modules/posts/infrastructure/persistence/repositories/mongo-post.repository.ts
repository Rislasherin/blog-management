import { PostModel } from "../models/post.model.js";
import type { IPostDocument } from "../models/post.model.js";
import type { IPostRepository } from "../../../domain/repositories/post.repository.interface.js";
import type { IPost } from "../../../domain/entities/post.entity.js";
import type { PaginationParams, PaginatedResult } from "../../../domain/types/pagination.types.js";

export class MongoPostRepository implements IPostRepository {
  private toDomain(document: IPostDocument): IPost {
    return {
      id: document._id.toString(),
      title: document.title,
      subtitle: document.subtitle ?? null,
      content: document.content,
      imageUrl: document.imageUrl ?? null,
      authorId: document.authorId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async create(data: {
    title: string;
    subtitle?: string | null;
    content: string;
    imageUrl?: string | null;
    authorId: string;
  }): Promise<IPost> {
    const post = await PostModel.create(data);
    return this.toDomain(post);
  }

  async findById(id: string): Promise<IPost | null> {
    const post = await PostModel.findById(id);
    if (!post) {
      return null;
    }
    return this.toDomain(post);
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [posts, totalItems] = await Promise.all([
      PostModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      PostModel.countDocuments()
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: posts.map((post) => this.toDomain(post)),
      page,
      limit,
      totalItems,
      totalPages
    };
  }

  async findByAuthorId(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [posts, totalItems] = await Promise.all([
      PostModel.find({ authorId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PostModel.countDocuments({ authorId })
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: posts.map((post) => this.toDomain(post)),
      page,
      limit,
      totalItems,
      totalPages
    };
  }

  async update(
    id: string,
    data: {
      title?: string;
      subtitle?: string | null;
      content?: string;
      imageUrl?: string | null;
    }
  ): Promise<IPost | null> {
    const post = await PostModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
    
    if (!post) {
      return null;
    }
    
    return this.toDomain(post);
  }

  async delete(id: string): Promise<boolean> {
    const result = await PostModel.findByIdAndDelete(id);
    return result !== null;
  }
}
