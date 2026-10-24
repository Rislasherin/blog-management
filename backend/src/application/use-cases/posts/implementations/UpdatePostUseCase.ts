import type { IPostRepository } from "../../../../domain/repositories/IPostRepository.js";
import type { IPost } from "../../../../domain/entities/Post.js";
import { HttpStatus } from "../../../../domain/enums/HttpStatus.enum.js";
import { AppError } from "../../../../domain/errors/AppError.js";
import type { IFileStorageService, UploadableFile } from "../../../interfaces/IFileStorageService.js";
import type { ILogger } from "../../../interfaces/ILogger.js";
import type { UpdatePostDTO, UpdatePostExecuteParams } from "../../../dtos/post.dto.js";
import type { IUpdatePostUseCase } from "../interfaces/IUpdatePostUseCase.js";

export class UpdatePostUseCase implements IUpdatePostUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly imageStorage: IFileStorageService,
    private readonly logger?: ILogger
  ) {}

  async execute(
    idOrParams: string | UpdatePostExecuteParams,
    userIdParam?: string,
    dtoParam?: UpdatePostDTO,
    fileParam?: UploadableFile
  ): Promise<IPost> {
    let id: string;
    let userId: string;
    let input: UpdatePostDTO;
    let file: UploadableFile | undefined;

    if (typeof idOrParams === "object") {
      id = idOrParams.id;
      userId = idOrParams.userId;
      input = idOrParams.dto;
      file = idOrParams.file;
    } else {
      id = idOrParams;
      userId = userIdParam || "";
      input = dtoParam || {};
      file = fileParam;
    }

    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new AppError(HttpStatus.NOT_FOUND, "Post not found");
    }

    if (post.authorId !== userId) {
      throw new AppError(HttpStatus.FORBIDDEN, "You are not allowed to modify this post");
    }

    let newImageUrl: string | undefined;
    const oldImageUrl = post.imageUrl;

    if (file) {
      newImageUrl = await this.imageStorage.upload(file);
    }

    const updatePayload: {
      title?: string;
      subtitle?: string | null;
      content?: string;
      imageUrl?: string | null;
    } = {};

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.subtitle !== undefined) {
      updatePayload.subtitle = input.subtitle && input.subtitle.trim().length > 0 ? input.subtitle.trim() : null;
    }
    if (input.content !== undefined) updatePayload.content = input.content;
    if (newImageUrl !== undefined) updatePayload.imageUrl = newImageUrl;

    try {
      const updatedPost = await this.postRepository.update(id, updatePayload);
      if (!updatedPost) {
        throw new AppError(HttpStatus.NOT_FOUND, "Post not found");
      }

      if (newImageUrl && oldImageUrl) {
        try {
          await this.imageStorage.delete(oldImageUrl);
        } catch (delError: unknown) {
          this.logger?.error({ delError }, "Failed to delete previous image after successful update");
        }
      }

      return updatedPost;
    } catch (error) {
      if (newImageUrl) {
        try {
          await this.imageStorage.delete(newImageUrl);
        } catch (delError: unknown) {
          this.logger?.error({ delError }, "Failed to cleanup newly uploaded image on failed update");
        }
      }
      throw error;
    }
  }
}

export default UpdatePostUseCase;
