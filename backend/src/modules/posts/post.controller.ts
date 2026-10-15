import type { Request, Response, NextFunction } from "express";
import type { IPostService } from "./post.types.js";
import { paginationSchema, type CreatePostInput, type UpdatePostInput } from "./post.validator.js";
import { AppError } from "../../shared/errors/AppError.js";

export class PostController {
  constructor(private readonly postService: IPostService) {}

  createPost = async (
    req: Request<{}, {}, CreatePostInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      const post = await this.postService.createPost(req.body, req.user.id, req.file);

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = paginationSchema.safeParse(req.query);

      if (!result.success) {
        throw new AppError(400, "Invalid pagination parameters");
      }

      const paginatedResult = await this.postService.getAllPosts(result.data);

      res.status(200).json({
        success: true,
        data: paginatedResult.items,
        pagination: {
          page: paginatedResult.page,
          limit: paginatedResult.limit,
          totalItems: paginatedResult.totalItems,
          totalPages: paginatedResult.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getPostById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const post = await this.postService.getPostById(req.params.id);
      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      next(error);
    }
  };

  getPostsByAuthor = async (
    req: Request<{ authorId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = paginationSchema.safeParse(req.query);

      if (!result.success) {
        throw new AppError(400, "Invalid pagination parameters");
      }

      const paginatedResult = await this.postService.getPostsByAuthor(
        req.params.authorId,
        result.data
      );

      res.status(200).json({
        success: true,
        data: paginatedResult.items,
        pagination: {
          page: paginatedResult.page,
          limit: paginatedResult.limit,
          totalItems: paginatedResult.totalItems,
          totalPages: paginatedResult.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updatePost = async (
    req: Request<{ id: string }, {}, UpdatePostInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      const post = await this.postService.updatePost(
        req.params.id,
        req.user.id,
        req.body,
        req.file
      );

      res.status(200).json({
        success: true,
        message: "Post updated successfully",
        data: post,
      });
    } catch (error) {
      next(error);
    }
  };

  deletePost = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      await this.postService.deletePost(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

export default PostController;
