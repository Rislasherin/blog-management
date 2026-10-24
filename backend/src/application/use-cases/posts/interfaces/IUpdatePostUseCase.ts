import type { IPost } from "../../../../domain/entities/Post.js";
import type { UploadableFile } from "../../../interfaces/IFileStorageService.js";
import type { UpdatePostDTO, UpdatePostExecuteParams } from "../../../dtos/post.dto.js";

export interface IUpdatePostUseCase {
  execute(
    idOrParams: string | UpdatePostExecuteParams,
    userIdParam?: string,
    dtoParam?: UpdatePostDTO,
    fileParam?: UploadableFile
  ): Promise<IPost>;
}

export default IUpdatePostUseCase;
