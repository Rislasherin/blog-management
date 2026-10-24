import type { IPost } from "../../domain/entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../../domain/value-objects/Pagination.js";
import type { UploadableFile } from "../interfaces/IFileStorageService.js";
import type { CreatePostDTO, UpdatePostDTO } from "../dtos/post.dto.js";

export interface IPostService {
  createPost(input: CreatePostDTO, userId: string, file?: UploadableFile): Promise<IPost>;
  getAllPosts(pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  getPostById(id: string): Promise<IPost>;
  getPostsByAuthor(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  updatePost(id: string, userId: string, input: UpdatePostDTO, file?: UploadableFile): Promise<IPost>;
  deletePost(id: string, userId: string): Promise<void>;
}

export default IPostService;
