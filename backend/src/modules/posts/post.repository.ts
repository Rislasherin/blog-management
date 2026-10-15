import { PostModel, type IPostDocument } from "./post.model.js";
import type { IPost, IPostRepository, PaginationParams, PaginatedResult } from "./post.types.js";

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
    subtitle?: string | null | undefined;
    content: string;
    imageUrl?: string | null | undefined;
    authorId: string;
  }): Promise<IPost> {
    const createPayload: Record<string, any> = {
      title: data.title,
      content: data.content,
      authorId: data.authorId,
    };
    if (data.subtitle !== undefined) createPayload.subtitle = data.subtitle;
    if (data.imageUrl !== undefined) createPayload.imageUrl = data.imageUrl;

    const post = await PostModel.create(createPayload);
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
      PostModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: posts.map((post) => this.toDomain(post)),
      page,
      limit,
      totalItems,
      totalPages,
    };
  }

  async findByAuthorId(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [posts, totalItems] = await Promise.all([
      PostModel.find({ authorId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PostModel.countDocuments({ authorId }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: posts.map((post) => this.toDomain(post)),
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

export default MongoPostRepository;
