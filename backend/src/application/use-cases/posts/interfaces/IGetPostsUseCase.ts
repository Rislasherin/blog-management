import type { IPost } from "../../../../domain/entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../../../../domain/value-objects/Pagination.js";
import type { GetPostsDTO } from "../../../dtos/post.dto.js";

export interface IGetPostsUseCase {
  execute(paginationOrDto?: PaginationParams | GetPostsDTO): Promise<PaginatedResult<IPost>>;
}

export type IGetAllPostsUseCase = IGetPostsUseCase;

export default IGetPostsUseCase;
