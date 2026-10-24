import type { IPost } from "../../../../domain/entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../../../../domain/value-objects/Pagination.js";
import type { GetPostsByAuthorDTO } from "../../../dtos/post.dto.js";

export interface IGetPostsByAuthorUseCase {
  execute(
    authorIdOrDto: string | GetPostsByAuthorDTO,
    paginationParam?: PaginationParams
  ): Promise<PaginatedResult<IPost>>;
}

export default IGetPostsByAuthorUseCase;
