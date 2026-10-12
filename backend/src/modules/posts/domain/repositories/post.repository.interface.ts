import type { IPost } from "../entities/post.entity.js";
import type { PaginationParams, PaginatedResult } from "../types/pagination.types.js";

export interface IPostRepository {
  create(data: {
    title: string;
    subtitle?: string | null | undefined;
    content: string;
    imageUrl?: string | null | undefined;
    authorId: string;
  }): Promise<IPost>;
  findById(id: string): Promise<IPost | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  findByAuthorId(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  update(
    id: string,
    data: {
      title?: string | undefined;
      subtitle?: string | null | undefined;
      content?: string | undefined;
      imageUrl?: string | null | undefined;
    }
  ): Promise<IPost | null>;
  delete(id: string): Promise<boolean>;
}
