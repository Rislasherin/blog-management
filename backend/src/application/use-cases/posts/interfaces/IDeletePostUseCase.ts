import type { DeletePostDTO } from "../../../dtos/post.dto.js";

export interface IDeletePostUseCase {
  execute(
    postIdOrDto: string | DeletePostDTO,
    userIdParam?: string
  ): Promise<void>;
}

export default IDeletePostUseCase;
