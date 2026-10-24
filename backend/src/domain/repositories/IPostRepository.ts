import type { IPost, Post } from "../entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../value-objects/Pagination.js";

export interface IPostRepository {
  create(data: {
    title: string;
    subtitle?: string | null | undefined;
    content: string;
    imageUrl?: string | null | undefined;
    authorId: string;
  }): Promise<IPost | Post>;

  findById(id: string): Promise<IPost | Post | null>;

  findAll(pagination: PaginationParams): Promise<PaginatedResult<IPost | Post>>;

  findByAuthorId(
    authorId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<IPost | Post>>;

  update(
    id: string,
    data: {
      title?: string | undefined;
      subtitle?: string | null | undefined;
      content?: string | undefined;
      imageUrl?: string | null | undefined;
    }
  ): Promise<IPost | Post | null>;

  delete(id: string): Promise<boolean>;
}

export default IPostRepository;
