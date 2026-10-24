import type { Request, Response, NextFunction } from "express";
import type { IPostService } from "../../../application/services/IPostService.js";
import type { ICreatePostUseCase } from "../../../application/use-cases/posts/interfaces/ICreatePostUseCase.js";
import type { IGetAllPostsUseCase } from "../../../application/use-cases/posts/interfaces/IGetPostsUseCase.js";
import type { IGetPostByIdUseCase } from "../../../application/use-cases/posts/interfaces/IGetPostByIdUseCase.js";
import type { IGetPostsByAuthorUseCase } from "../../../application/use-cases/posts/interfaces/IGetPostsByAuthorUseCase.js";
import type { IUpdatePostUseCase } from "../../../application/use-cases/posts/interfaces/IUpdatePostUseCase.js";
import type { IDeletePostUseCase } from "../../../application/use-cases/posts/interfaces/IDeletePostUseCase.js";
import {
  paginationSchema,
  type CreatePostInput,
  type UpdatePostInput,
} from "../validators/post.validator.js";
import { AppError } from "../../../domain/errors/AppError.js";
import { HttpStatus } from "../../../domain/enums/HttpStatus.enum.js";

export interface PostControllerDependencies {
  createPostUseCase: ICreatePostUseCase;
  getAllPostsUseCase: IGetAllPostsUseCase;
  getPostByIdUseCase: IGetPostByIdUseCase;
  getPostsByAuthorUseCase: IGetPostsByAuthorUseCase;
  updatePostUseCase: IUpdatePostUseCase;
  deletePostUseCase: IDeletePostUseCase;
}

export class PostController {
  private readonly createPostUseCase: ICreatePostUseCase;
  private readonly getAllPostsUseCase: IGetAllPostsUseCase;
  private readonly getPostByIdUseCase: IGetPostByIdUseCase;
  private readonly getPostsByAuthorUseCase: IGetPostsByAuthorUseCase;
  private readonly updatePostUseCase: IUpdatePostUseCase;
  private readonly deletePostUseCase: IDeletePostUseCase;

  constructor(depsOrService: PostControllerDependencies | IPostService) {
    if ("createPostUseCase" in depsOrService) {
      this.createPostUseCase = depsOrService.createPostUseCase;
      this.getAllPostsUseCase = depsOrService.getAllPostsUseCase;
      this.getPostByIdUseCase = depsOrService.getPostByIdUseCase;
      this.getPostsByAuthorUseCase = depsOrService.getPostsByAuthorUseCase;
      this.updatePostUseCase = depsOrService.updatePostUseCase;
      this.deletePostUseCase = depsOrService.deletePostUseCase;
    } else {
      const service = depsOrService;
      this.createPostUseCase = {
        execute: (dtoOrParams, userId, file) => {
          if ("dto" in dtoOrParams) {
            return service.createPost(dtoOrParams.dto, dtoOrParams.userId, dtoOrParams.file);
          }
          return service.createPost(dtoOrParams, userId || "", file);
        },
      };
      this.getAllPostsUseCase = {
        execute: (pagination) =>
          service.getAllPosts({ page: pagination?.page ?? 1, limit: pagination?.limit ?? 10 }),
      };
      this.getPostByIdUseCase = {
        execute: (idOrDto) =>
          typeof idOrDto === "string" ? service.getPostById(idOrDto) : service.getPostById(idOrDto.id),
      };
      this.getPostsByAuthorUseCase = {
        execute: (authorIdOrDto, pagination) =>
          typeof authorIdOrDto === "string"
            ? service.getPostsByAuthor(authorIdOrDto, pagination || { page: 1, limit: 10 })
            : service.getPostsByAuthor(authorIdOrDto.authorId, {
                page: authorIdOrDto.page || 1,
                limit: authorIdOrDto.limit || 10,
              }),
      };
      this.updatePostUseCase = {
        execute: (idOrParams, userId, dto, file) => {
          if (typeof idOrParams === "object") {
            return service.updatePost(
              idOrParams.id,
              idOrParams.userId,
              idOrParams.dto,
              idOrParams.file
            );
          }
          return service.updatePost(idOrParams, userId || "", dto || {}, file);
        },
      };
      this.deletePostUseCase = {
        execute: (postIdOrDto, userId) =>
          typeof postIdOrDto === "string"
            ? service.deletePost(postIdOrDto, userId || "")
            : service.deletePost(postIdOrDto.postId, postIdOrDto.userId),
      };
    }
  }

  createPost = async (
    req: Request<Record<string, never>, unknown, CreatePostInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new AppError(HttpStatus.UNAUTHORIZED, "Authentication required");
      }

      const file = req.file
        ? {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname,
            size: req.file.size,
          }
        : undefined;

      const post = await this.createPostUseCase.execute(
        req.body,
        userId,
        file
      );

      res.status(HttpStatus.CREATED).json({
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
  ): Promise<void> => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await this.getAllPostsUseCase.execute({ page, limit });

      res.status(HttpStatus.OK).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
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
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const post = await this.getPostByIdUseCase.execute(id);

      res.status(HttpStatus.OK).json({
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
  ): Promise<void> => {
    try {
      const { authorId } = req.params;
      const { page, limit } = paginationSchema.parse(req.query);

      const result = await this.getPostsByAuthorUseCase.execute(authorId, {
        page,
        limit,
      });

      res.status(HttpStatus.OK).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updatePost = async (
    req: Request<{ id: string }, unknown, UpdatePostInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new AppError(HttpStatus.UNAUTHORIZED, "Authentication required");
      }

      const { id } = req.params;
      const file = req.file
        ? {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname,
            size: req.file.size,
          }
        : undefined;

      const post = await this.updatePostUseCase.execute(
        id,
        userId,
        {
          title: req.body.title,
          subtitle: req.body.subtitle !== undefined ? req.body.subtitle : null,
          content: req.body.content,
        },
        file
      );

      res.status(HttpStatus.OK).json({
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
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        throw new AppError(HttpStatus.UNAUTHORIZED, "Authentication required");
      }

      const { id } = req.params;
      await this.deletePostUseCase.execute(id, userId);

      res.status(HttpStatus.OK).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

export default PostController;
