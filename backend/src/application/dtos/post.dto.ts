import type { IPost } from "../../domain/entities/Post.js";
import type { UploadableFile } from "../interfaces/IFileStorageService.js";

export interface CreatePostDTO {
  title: string;
  subtitle?: string | null | undefined;
  content: string;
}

export interface CreatePostExecuteParams {
  dto: CreatePostDTO;
  userId: string;
  file?: UploadableFile | undefined;
}

export interface UpdatePostDTO {
  title?: string | undefined;
  subtitle?: string | null | undefined;
  content?: string | undefined;
}

export interface UpdatePostExecuteParams {
  id: string;
  userId: string;
  dto: UpdatePostDTO;
  file?: UploadableFile | undefined;
}

export interface DeletePostDTO {
  postId: string;
  userId: string;
}

export interface GetPostsDTO {
  page?: number | undefined;
  limit?: number | undefined;
}

export interface GetPostByIdDTO {
  id: string;
}

export interface GetPostsByAuthorDTO {
  authorId: string;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedPostsDTO {
  items: IPost[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}
