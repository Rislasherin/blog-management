import type { RequestHandler, Router } from "express";
import { MongoPostRepository } from "./post.repository.js";
import { CloudinaryImageStorage } from "./cloudinary.storage.js";
import { PostService } from "./post.service.js";
import { PostController } from "./post.controller.js";
import { createPostRouter } from "./post.routes.js";
import type { IPostRepository, IImageStorage, IPostService } from "./post.types.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.middleware.js";
import { JwtTokenService } from "../auth/jwt.service.js";

export interface PostModuleDependencies {
  postRepository?: IPostRepository;
  imageStorage?: IImageStorage;
  postService?: IPostService;
  requireAuth?: RequestHandler;
  authMiddleware?: RequestHandler;
}

export interface PostModule {
  postRepository: IPostRepository;
  imageStorage: IImageStorage;
  postService: IPostService;
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

export default createPostModule;
