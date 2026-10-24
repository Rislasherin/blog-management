import type { IPostRepository } from "../../domain/repositories/IPostRepository.js";
import type { IFileStorageService, UploadableFile } from "../interfaces/IFileStorageService.js";
import type { ILogger } from "../interfaces/ILogger.js";
import type { IPost } from "../../domain/entities/Post.js";
import type { PaginationParams, PaginatedResult } from "../../domain/value-objects/Pagination.js";

import { CreatePostUseCase } from "../use-cases/posts/implementations/CreatePostUseCase.js";
import type { ICreatePostUseCase } from "../use-cases/posts/interfaces/ICreatePostUseCase.js";
import { GetPostsUseCase } from "../use-cases/posts/implementations/GetPostsUseCase.js";
import type { IGetPostsUseCase, IGetAllPostsUseCase } from "../use-cases/posts/interfaces/IGetPostsUseCase.js";
import { GetPostByIdUseCase } from "../use-cases/posts/implementations/GetPostByIdUseCase.js";
import type { IGetPostByIdUseCase } from "../use-cases/posts/interfaces/IGetPostByIdUseCase.js";
import { GetPostsByAuthorUseCase } from "../use-cases/posts/implementations/GetPostsByAuthorUseCase.js";
import type { IGetPostsByAuthorUseCase } from "../use-cases/posts/interfaces/IGetPostsByAuthorUseCase.js";
import { UpdatePostUseCase } from "../use-cases/posts/implementations/UpdatePostUseCase.js";
import type { IUpdatePostUseCase } from "../use-cases/posts/interfaces/IUpdatePostUseCase.js";
import { DeletePostUseCase } from "../use-cases/posts/implementations/DeletePostUseCase.js";
import type { IDeletePostUseCase } from "../use-cases/posts/interfaces/IDeletePostUseCase.js";

import type { CreatePostDTO, UpdatePostDTO } from "../dtos/post.dto.js";
import type { IPostService } from "./IPostService.js";

export class PostService implements IPostService {
  public readonly createPostUseCase: ICreatePostUseCase;
  public readonly getAllPostsUseCase: IGetAllPostsUseCase;
  public readonly getPostByIdUseCase: IGetPostByIdUseCase;
  public readonly getPostsByAuthorUseCase: IGetPostsByAuthorUseCase;
  public readonly updatePostUseCase: IUpdatePostUseCase;
  public readonly deletePostUseCase: IDeletePostUseCase;

  constructor(
    postRepositoryOrCreateUseCase: IPostRepository | ICreatePostUseCase,
    imageStorageOrGetAllUseCase: IFileStorageService | IGetAllPostsUseCase,
    loggerOrGetByIdUseCase?: ILogger | IGetPostByIdUseCase,
    getPostsByAuthorUseCase?: IGetPostsByAuthorUseCase,
    updatePostUseCase?: IUpdatePostUseCase,
    deletePostUseCase?: IDeletePostUseCase
  ) {
    if (
      getPostsByAuthorUseCase &&
      updatePostUseCase &&
      deletePostUseCase &&
      "execute" in postRepositoryOrCreateUseCase
    ) {
      this.createPostUseCase = postRepositoryOrCreateUseCase as ICreatePostUseCase;
      this.getAllPostsUseCase = imageStorageOrGetAllUseCase as IGetAllPostsUseCase;
      this.getPostByIdUseCase = loggerOrGetByIdUseCase as IGetPostByIdUseCase;
      this.getPostsByAuthorUseCase = getPostsByAuthorUseCase;
      this.updatePostUseCase = updatePostUseCase;
      this.deletePostUseCase = deletePostUseCase;
    } else {
      const postRepo = postRepositoryOrCreateUseCase as IPostRepository;
      const imageStorage = imageStorageOrGetAllUseCase as IFileStorageService;
      const logger = loggerOrGetByIdUseCase as ILogger | undefined;

      this.createPostUseCase = new CreatePostUseCase(postRepo, imageStorage, logger);
      this.getAllPostsUseCase = new GetPostsUseCase(postRepo);
      this.getPostByIdUseCase = new GetPostByIdUseCase(postRepo);
      this.getPostsByAuthorUseCase = new GetPostsByAuthorUseCase(postRepo);
      this.updatePostUseCase = new UpdatePostUseCase(postRepo, imageStorage, logger);
      this.deletePostUseCase = new DeletePostUseCase(postRepo, imageStorage);
    }
  }

  async createPost(
    input: CreatePostDTO,
    userId: string,
    file?: UploadableFile
  ): Promise<IPost> {
    return this.createPostUseCase.execute(input, userId, file);
  }

  async getAllPosts(pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    return this.getAllPostsUseCase.execute(pagination);
  }

  async getPostById(id: string): Promise<IPost> {
    return this.getPostByIdUseCase.execute(id);
  }

  async getPostsByAuthor(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    return this.getPostsByAuthorUseCase.execute(authorId, pagination);
  }

  async updatePost(
    postId: string,
    userId: string,
    input: UpdatePostDTO,
    file?: UploadableFile
  ): Promise<IPost> {
    return this.updatePostUseCase.execute(postId, userId, input, file);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    await this.deletePostUseCase.execute(postId, userId);
  }
}

export default PostService;
