import type { RequestHandler, Router } from "express";
import { MongoPostRepository } from "./infrastructure/persistence/repositories/mongo-post.repository.js";
import { CloudinaryImageStorage } from "./infrastructure/storage/cloudinary-image.storage.js";
import { PostService } from "./application/services/post.service.js";
import { PostController } from "./presentation/controllers/post.controller.js";
import { createPostRouter } from "./presentation/routes/post.routes.js";
import type { IPostRepository } from "./domain/repositories/post.repository.interface.js";
import type { IImageStorage } from "./domain/services/image.storage.interface.js";
import { createAuthMiddleware } from "../auth/presentation/middleware/auth.middleware.js";
import { JwtTokenService } from "../auth/infrastructure/security/jwt.service.js";

export interface PostModuleDependencies {
  postRepository?: IPostRepository;
  imageStorage?: IImageStorage;
  requireAuth?: RequestHandler;
  authMiddleware?: RequestHandler;
}

export interface PostModule {
  postRepository: IPostRepository;
  imageStorage: IImageStorage;
  postService: PostService;
  postController: PostController;
  postRouter: Router;
  router: Router;
}

export const createPostModule = (deps?: PostModuleDependencies): PostModule => {
  const postRepository = deps?.postRepository ?? new MongoPostRepository();
  const imageStorage = deps?.imageStorage ?? new CloudinaryImageStorage();
  const postService = new PostService(postRepository, imageStorage);
  const postController = new PostController(postService);
  const authMw = deps?.requireAuth ?? deps?.authMiddleware ?? createAuthMiddleware(new JwtTokenService());
  const postRouter = createPostRouter(postController, authMw);

  return {
    postRepository,
    imageStorage,
    postService,
    postController,
    postRouter,
    router: postRouter,
  };
};
