import type { IPostRepository } from "../../../../domain/repositories/IPostRepository.js";
import type { IPost } from "../../../../domain/entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../../../../domain/value-objects/Pagination.js";
import type { GetPostsByAuthorDTO } from "../../../dtos/post.dto.js";
import type { IGetPostsByAuthorUseCase } from "../interfaces/IGetPostsByAuthorUseCase.js";

export class GetPostsByAuthorUseCase implements IGetPostsByAuthorUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(
    authorIdOrDto: string | GetPostsByAuthorDTO,
    paginationParam?: PaginationParams
  ): Promise<PaginatedResult<IPost>> {
    let authorId: string;
    let page = 1;
    let limit = 10;

    if (typeof authorIdOrDto === "object") {
      authorId = authorIdOrDto.authorId;
      page = authorIdOrDto.page ?? 1;
      limit = authorIdOrDto.limit ?? 10;
    } else {
      authorId = authorIdOrDto;
      page = paginationParam?.page ?? 1;
      limit = paginationParam?.limit ?? 10;
    }

    return this.postRepository.findByAuthorId(authorId, { page, limit });
  }
}

export default GetPostsByAuthorUseCase;
