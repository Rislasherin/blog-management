import type { IPost } from "../../../../domain/entities/Post.js";
import type { UploadableFile } from "../../../interfaces/IFileStorageService.js";
import type { CreatePostDTO, CreatePostExecuteParams } from "../../../dtos/post.dto.js";

export interface ICreatePostUseCase {
  execute(
    dtoOrParams: CreatePostDTO | CreatePostExecuteParams,
    userIdParam?: string,
    fileParam?: UploadableFile
  ): Promise<IPost>;
}

export default ICreatePostUseCase;
