import type { IPostRepository } from "../../../../domain/repositories/IPostRepository.js";
import type { IPost } from "../../../../domain/entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../../../../domain/value-objects/Pagination.js";
import type { GetPostsDTO } from "../../../dtos/post.dto.js";
import type { IGetPostsUseCase } from "../interfaces/IGetPostsUseCase.js";

export class GetPostsUseCase implements IGetPostsUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(paginationOrDto?: PaginationParams | GetPostsDTO): Promise<PaginatedResult<IPost>> {
    const page = paginationOrDto?.page ?? 1;
    const limit = paginationOrDto?.limit ?? 10;
    return this.postRepository.findAll({ page, limit });
  }
}

export default GetPostsUseCase;
