import type { IPost } from "../types/post.types.js";
import type { PaginationParams, PaginatedResult } from "../types/pagination.types.js";

export interface IPostRepository {
  create(data: {
    title: string;
    subtitle?: string | null;
    content: string;
    imageUrl?: string | null;
    authorId: string;
  }): Promise<IPost>;
  findById(id: string): Promise<IPost | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  findByAuthorId(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  update(
    id: string,
    data: {
      title?: string;
      subtitle?: string | null;
      content?: string;
      imageUrl?: string | null;
    }
  ): Promise<IPost | null>;
  delete(id: string): Promise<boolean>;
}
