import type { IPost } from "../../../../domain/entities/Post.js";
import type { GetPostByIdDTO } from "../../../dtos/post.dto.js";

export interface IGetPostByIdUseCase {
  execute(idOrDto: string | GetPostByIdDTO): Promise<IPost>;
}

export default IGetPostByIdUseCase;
