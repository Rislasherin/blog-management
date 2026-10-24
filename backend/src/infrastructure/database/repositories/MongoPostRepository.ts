import { PostModel } from "../models/PostModel.js";
import { PostMapper } from "../mappers/PostMapper.js";
import type { Post } from "../../../domain/entities/Post.js";
import type { IPostRepository } from "../../../domain/repositories/IPostRepository.js";
import type {
  PaginationParams,
  PaginatedResult,
} from "../../../domain/value-objects/Pagination.js";

export class MongoPostRepository implements IPostRepository {
  async create(data: {
    title: string;
    subtitle?: string | null | undefined;
    content: string;
    imageUrl?: string | null | undefined;
    authorId: string;
  }): Promise<Post> {
    const createPayload: {
      title: string;
      content: string;
      authorId: string;
      subtitle?: string | null;
      imageUrl?: string | null;
    } = {
      title: data.title,
      content: data.content,
      authorId: data.authorId,
    };
    if (data.subtitle !== undefined) createPayload.subtitle = data.subtitle;
    if (data.imageUrl !== undefined) createPayload.imageUrl = data.imageUrl;

    const post = await PostModel.create(createPayload);
    return PostMapper.toDomain(post);
  }

  async findById(id: string): Promise<Post | null> {
    const post = await PostModel.findById(id);
    if (!post) {
      return null;
    }
    return PostMapper.toDomain(post);
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<Post>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [posts, totalItems] = await Promise.all([
      PostModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      PostModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: posts.map((post) => PostMapper.toDomain(post)),
      page,
      limit,
      totalItems,
      totalPages,
    };
  }

  async findByAuthorId(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<Post>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [posts, totalItems] = await Promise.all([
      PostModel.find({ authorId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PostModel.countDocuments({ authorId }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: posts.map((post) => PostMapper.toDomain(post)),
      page,
      limit,
      totalItems,
      totalPages,
    };
  }

  async update(
    id: string,
    data: {
      title?: string | undefined;
      subtitle?: string | null | undefined;
      content?: string | undefined;
      imageUrl?: string | null | undefined;
    }
  ): Promise<Post | null> {
    const post = await PostModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );

    if (!post) {
      return null;
    }

    return PostMapper.toDomain(post);
  }

  async delete(id: string): Promise<boolean> {
    const result = await PostModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export default MongoPostRepository;
