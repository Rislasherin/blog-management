import type { IPostRepository } from "../../../../domain/repositories/IPostRepository.js";
import type { IPost } from "../../../../domain/entities/Post.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { GetPostByIdDTO } from "../../../dtos/post.dto.js";
import type { IGetPostByIdUseCase } from "../interfaces/IGetPostByIdUseCase.js";

export class GetPostByIdUseCase implements IGetPostByIdUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(idOrDto: string | GetPostByIdDTO): Promise<IPost> {
    const id = typeof idOrDto === "string" ? idOrDto : idOrDto.id;
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new AppError(HttpStatus.NOT_FOUND, "Post not found");
    }
    return post;
  }
}

export default GetPostByIdUseCase;
