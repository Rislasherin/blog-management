import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreatePostUseCase } from "../../../src/application/use-cases/posts/implementations/CreatePostUseCase.js";
import { GetPostsUseCase as GetAllPostsUseCase } from "../../../src/application/use-cases/posts/implementations/GetPostsUseCase.js";
import { GetPostByIdUseCase } from "../../../src/application/use-cases/posts/implementations/GetPostByIdUseCase.js";
import { GetPostsByAuthorUseCase } from "../../../src/application/use-cases/posts/implementations/GetPostsByAuthorUseCase.js";
import { UpdatePostUseCase } from "../../../src/application/use-cases/posts/implementations/UpdatePostUseCase.js";
import { DeletePostUseCase } from "../../../src/application/use-cases/posts/implementations/DeletePostUseCase.js";
import { AppError } from "../../../src/domain/errors/AppError.js";
import type { IPostRepository } from "../../../src/domain/repositories/IPostRepository.js";
import type { IPost } from "../../../src/domain/entities/Post.js";
import type { IFileStorageService as IImageStorage } from "../../../src/application/interfaces/IFileStorageService.js";

describe("Post Use Cases (Clean Architecture Unit Tests)", () => {
  let mockPostRepo: IPostRepository;
  let mockImageStorage: IImageStorage;

  const samplePost: IPost = {
    id: "post-123",
    title: "Domain-Driven Design",
    subtitle: "Architecture Guide",
    content: "Clean architecture principles and patterns.",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    authorId: "author-user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPostRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByAuthorId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockImageStorage = {
      upload: vi.fn().mockResolvedValue("https://res.cloudinary.com/demo/image/upload/uploaded.jpg"),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("CreatePostUseCase", () => {
    it("should create a post with uploaded image", async () => {
      vi.mocked(mockPostRepo.create).mockResolvedValue(samplePost);

      const useCase = new CreatePostUseCase(mockPostRepo, mockImageStorage);
      const post = await useCase.execute(
        { title: "Domain-Driven Design", content: "Content" },
        "author-user-1",
        { buffer: Buffer.from("test"), mimetype: "image/png" }
      );

      expect(mockImageStorage.upload).toHaveBeenCalledTimes(1);
      expect(mockPostRepo.create).toHaveBeenCalledTimes(1);
      expect(post.id).toBe("post-123");
    });

    it("should roll back uploaded image if repository create fails", async () => {
      vi.mocked(mockPostRepo.create).mockRejectedValue(new Error("Database error"));

      const useCase = new CreatePostUseCase(mockPostRepo, mockImageStorage);
      await expect(
        useCase.execute(
          { title: "Fail", content: "Fail" },
          "author-user-1",
          { buffer: Buffer.from("test"), mimetype: "image/png" }
        )
      ).rejects.toThrow("Database error");

      expect(mockImageStorage.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("GetPostByIdUseCase", () => {
    it("should return post if found", async () => {
      vi.mocked(mockPostRepo.findById).mockResolvedValue(samplePost);

      const useCase = new GetPostByIdUseCase(mockPostRepo);
      const post = await useCase.execute("post-123");

      expect(post.title).toBe("Domain-Driven Design");
    });

    it("should throw AppError(404) if post not found", async () => {
      vi.mocked(mockPostRepo.findById).mockResolvedValue(null);

      const useCase = new GetPostByIdUseCase(mockPostRepo);
      await expect(useCase.execute("missing-id")).rejects.toThrow(AppError);
    });
  });

  describe("GetAllPostsUseCase", () => {
    it("should return paginated result from repository", async () => {
      vi.mocked(mockPostRepo.findAll).mockResolvedValue({
        items: [samplePost],
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
      });

      const useCase = new GetAllPostsUseCase(mockPostRepo);
      const result = await useCase.execute({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("GetPostsByAuthorUseCase", () => {
    it("should return author posts from repository", async () => {
      vi.mocked(mockPostRepo.findByAuthorId).mockResolvedValue({
        items: [samplePost],
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
      });

      const useCase = new GetPostsByAuthorUseCase(mockPostRepo);
      const result = await useCase.execute("author-user-1", { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(mockPostRepo.findByAuthorId).toHaveBeenCalledWith("author-user-1", { page: 1, limit: 10 });
    });
  });

  describe("UpdatePostUseCase", () => {
    it("should disallow modification by a non-author", async () => {
      vi.mocked(mockPostRepo.findById).mockResolvedValue(samplePost);

      const useCase = new UpdatePostUseCase(mockPostRepo, mockImageStorage);
      await expect(
        useCase.execute("post-123", "different-user-id", { title: "Updated Title" })
      ).rejects.toThrow(AppError);
    });

    it("should update post and cleanup old image if new image is uploaded", async () => {
      vi.mocked(mockPostRepo.findById).mockResolvedValue(samplePost);
      vi.mocked(mockPostRepo.update).mockResolvedValue({
        ...samplePost,
        imageUrl: "https://res.cloudinary.com/demo/image/upload/uploaded.jpg",
      });

      const useCase = new UpdatePostUseCase(mockPostRepo, mockImageStorage);
      const updated = await useCase.execute(
        "post-123",
        "author-user-1",
        { title: "Updated Title" },
        { buffer: Buffer.from("new-img"), mimetype: "image/png" }
      );

      expect(mockImageStorage.upload).toHaveBeenCalledTimes(1);
      expect(mockImageStorage.delete).toHaveBeenCalledWith(samplePost.imageUrl);
      expect(updated.imageUrl).toBe("https://res.cloudinary.com/demo/image/upload/uploaded.jpg");
    });
  });

  describe("DeletePostUseCase", () => {
    it("should delete post and remove associated image", async () => {
      vi.mocked(mockPostRepo.findById).mockResolvedValue(samplePost);
      vi.mocked(mockPostRepo.delete).mockResolvedValue(true);

      const useCase = new DeletePostUseCase(mockPostRepo, mockImageStorage);
      await useCase.execute("post-123", "author-user-1");

      expect(mockPostRepo.delete).toHaveBeenCalledWith("post-123");
      expect(mockImageStorage.delete).toHaveBeenCalledWith(samplePost.imageUrl);
    });
  });
});
