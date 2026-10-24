import type { IPostRepository } from "../../../../domain/repositories/IPostRepository.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { IFileStorageService } from "../../../interfaces/IFileStorageService.js";
import type { DeletePostDTO } from "../../../dtos/post.dto.js";
import type { IDeletePostUseCase } from "../interfaces/IDeletePostUseCase.js";

export class DeletePostUseCase implements IDeletePostUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly imageStorage: IFileStorageService
  ) {}

  async execute(postIdOrDto: string | DeletePostDTO, userIdParam?: string): Promise<void> {
    let postId: string;
    let userId: string;

    if (typeof postIdOrDto === "object") {
      postId = postIdOrDto.postId;
      userId = postIdOrDto.userId;
    } else {
      postId = postIdOrDto;
      userId = userIdParam || "";
    }

    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError(HttpStatus.NOT_FOUND, "Post not found");
    }

    if (post.authorId !== userId) {
      throw new AppError(HttpStatus.FORBIDDEN, "You are not allowed to modify this post");
    }

    if (post.imageUrl) {
      try {
        await this.imageStorage.delete(post.imageUrl);
      } catch {
        // Log or ignore non-blocking storage cleanup failure
      }
    }

    await this.postRepository.delete(postId);
  }
}

export default DeletePostUseCase;
