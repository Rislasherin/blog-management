import { Router } from "express";
import PostController from "./post.controller.js";
import PostService from "./post.service.js";
import { MongoPostRepository } from "./repositories/mongo-post.repository.js";
import JwtTokenService from "../auth/services/jwt.service.js";
import validate from "../../middleware/validate.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { createPostSchema, updatePostSchema } from "./post.validator.js";
import { upload } from "../../middleware/upload.middleware.js";
import { CloudinaryImageStorage } from "./services/cloudinary-image.storage.js";

const postRouter = Router();

// Composition root for Post Module
const postRepository = new MongoPostRepository();
const imageStorage = new CloudinaryImageStorage();
const postService = new PostService(postRepository, imageStorage);
const postController = new PostController(postService);
const tokenService = new JwtTokenService();

const requireAuth = authMiddleware(tokenService);

// Public routes
postRouter.get("/", postController.getAllPosts);
postRouter.get("/author/:authorId", postController.getPostsByAuthor);
postRouter.get("/:id", postController.getPostById);

// Protected routes
postRouter.post(
  "/",
  requireAuth,
  upload.single("image"),
  validate(createPostSchema),
  postController.createPost
);

postRouter.patch(
  "/:id",
  requireAuth,
  upload.single("image"),
  validate(updatePostSchema),
  postController.updatePost
);

postRouter.delete(
  "/:id",
  requireAuth,
  postController.deletePost
);

export default postRouter;
