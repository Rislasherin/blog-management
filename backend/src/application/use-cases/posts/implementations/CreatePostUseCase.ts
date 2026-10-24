import type { IPostRepository } from "../../../../domain/repositories/IPostRepository.js";
import type { IPost } from "../../../../domain/entities/Post.js";
import type { IFileStorageService, UploadableFile } from "../../../interfaces/IFileStorageService.js";
import type { ILogger } from "../../../interfaces/ILogger.js";
import type { CreatePostDTO, CreatePostExecuteParams } from "../../../dtos/post.dto.js";
import type { ICreatePostUseCase } from "../interfaces/ICreatePostUseCase.js";

export class CreatePostUseCase implements ICreatePostUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly imageStorage: IFileStorageService,
    private readonly logger?: ILogger
  ) {}

  async execute(
    dtoOrParams: CreatePostDTO | CreatePostExecuteParams,
    userIdParam?: string,
    fileParam?: UploadableFile
  ): Promise<IPost> {
    let input: CreatePostDTO;
    let userId: string;
    let file: UploadableFile | undefined;

    if ("dto" in dtoOrParams) {
      input = dtoOrParams.dto;
      userId = dtoOrParams.userId;
      file = dtoOrParams.file;
    } else {
      input = dtoOrParams;
      userId = userIdParam || "";
      file = fileParam;
    }

    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.imageStorage.upload(file);
    }

    try {
      const post = await this.postRepository.create({
        title: input.title,
        subtitle: input.subtitle !== undefined ? input.subtitle : null,
        content: input.content,
        imageUrl,
        authorId: userId,
      });

      return post;
    } catch (error) {
      if (imageUrl) {
        try {
          await this.imageStorage.delete(imageUrl);
        } catch (delError: unknown) {
          this.logger?.error({ delError }, "Failed to cleanup uploaded image after database failure");
        }
      }
      throw error;
    }
  }
}

export default CreatePostUseCase;
