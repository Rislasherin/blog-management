import { Router, type RequestHandler } from "express";
import type { PostController } from "./post.controller.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { upload } from "../../shared/middleware/upload.middleware.js";
import { createPostSchema, updatePostSchema } from "./post.validator.js";

export const createPostRouter = (
  postController: PostController,
  requireAuth: RequestHandler
): Router => {
  const router = Router();

  // Public routes
  router.get("/", postController.getAllPosts);
  router.get("/author/:authorId", postController.getPostsByAuthor);
  router.get("/:id", postController.getPostById);

  // Protected routes
  router.post(
    "/",
    requireAuth,
    upload.single("image"),
    validate(createPostSchema),
    postController.createPost
  );

  router.patch(
    "/:id",
    requireAuth,
    upload.single("image"),
    validate(updatePostSchema),
    postController.updatePost
  );

  router.delete(
    "/:id",
    requireAuth,
    postController.deletePost
  );

  return router;
};

export default createPostRouter;
