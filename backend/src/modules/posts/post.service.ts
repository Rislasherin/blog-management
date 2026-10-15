import type { IPostRepository, IImageStorage, IPost, PaginationParams, PaginatedResult, CreatePostDTO, UpdatePostDTO, IPostService } from "./post.types.js";
import { AppError } from "../../shared/errors/AppError.js";
import logger from "../../logger/logger.js";

export class PostService implements IPostService {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly imageStorage: IImageStorage
  ) {}

  async createPost(
    input: CreatePostDTO,
    userId: string,
    file?: Express.Multer.File
  ): Promise<IPost> {
    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.imageStorage.upload(file);
    }

    const subtitle = input.subtitle && input.subtitle.trim().length > 0 ? input.subtitle.trim() : null;

    try {
      return await this.postRepository.create({
        title: input.title,
        subtitle,
        content: input.content,
        imageUrl,
        authorId: userId,
      });
    } catch (error) {
      if (imageUrl) {
        try {
          await this.imageStorage.delete(imageUrl);
        } catch (cleanupError) {
          logger.error({ imageUrl, error: cleanupError }, "Failed to clean up image after post creation failed");
        }
      }
      throw error;
    }
  }

  async getAllPosts(pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    return this.postRepository.findAll(pagination);
  }

  async getPostById(id: string): Promise<IPost> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new AppError(404, "Post not found");
    }
    return post;
  }

  async getPostsByAuthor(userId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>> {
    return this.postRepository.findByAuthorId(userId, pagination);
  }

  async updatePost(
    postId: string,
    userId: string,
    input: UpdatePostDTO,
    file?: Express.Multer.File
  ): Promise<IPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new AppError(404, "Post not found");
    }

    if (post.authorId !== userId) {
      throw new AppError(403, "You are not allowed to modify this post");
    }

    let newImageUrl: string | undefined = undefined;

    if (file) {
      newImageUrl = await this.imageStorage.upload(file);
    }

    const updateData: Parameters<IPostRepository["update"]>[1] = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.subtitle !== undefined) {
      updateData.subtitle = input.subtitle && input.subtitle.trim().length > 0 ? input.subtitle.trim() : null;
    }
    if (input.content !== undefined) updateData.content = input.content;
    if (newImageUrl !== undefined) updateData.imageUrl = newImageUrl;

    if (Object.keys(updateData).length === 0) {
      if (newImageUrl) {
        try {
          await this.imageStorage.delete(newImageUrl);
        } catch (cleanupError) {
          logger.error({ imageUrl: newImageUrl, error: cleanupError }, "Failed to clean up image");
        }
      }
      throw new AppError(400, "Update payload cannot be empty");
    }

    try {
      const updatedPost = await this.postRepository.update(postId, updateData);

      if (!updatedPost) {
        throw new AppError(404, "Post not found during update");
      }

      if (newImageUrl && post.imageUrl) {
        try {
          await this.imageStorage.delete(post.imageUrl);
        } catch (cleanupError) {
          logger.error({ imageUrl: post.imageUrl, error: cleanupError }, "Failed to clean up old image");
        }
      }

      return updatedPost;
    } catch (error) {
      if (newImageUrl) {
        try {
          await this.imageStorage.delete(newImageUrl);
        } catch (cleanupError) {
          logger.error({ imageUrl: newImageUrl, error: cleanupError }, "Failed to clean up new image after update failed");
        }
      }
      throw error;
    }
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new AppError(404, "Post not found");
    }

    if (post.authorId !== userId) {
      throw new AppError(403, "You are not allowed to modify this post");
    }

    const deleted = await this.postRepository.delete(postId);
    if (!deleted) {
      throw new AppError(404, "Post not found during deletion");
    }

    if (post.imageUrl) {
      try {
        await this.imageStorage.delete(post.imageUrl);
      } catch (cleanupError) {
        logger.error({ imageUrl: post.imageUrl, error: cleanupError }, "Failed to clean up image after post deletion");
      }
    }
  }
}

export default PostService;
