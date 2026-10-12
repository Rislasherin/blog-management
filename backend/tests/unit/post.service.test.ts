import { describe, it, expect, vi, beforeEach } from "vitest";
import PostService from "../../src/modules/posts/post.service.js";
import AppError from "../../src/utils/appError.js";
import type { IPostRepository } from "../../src/modules/posts/interfaces/post.repository.interface.js";
import type { IImageStorage } from "../../src/modules/posts/interfaces/image.storage.interface.js";
import type { IPost } from "../../src/modules/posts/types/post.types.js";

const mockRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  findByAuthorId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as IPostRepository;

const mockStorage = {
  upload: vi.fn(),
  delete: vi.fn(),
} as unknown as IImageStorage;

describe("PostService", () => {
  let service: PostService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PostService(mockRepository, mockStorage);
  });

  const mockPost: IPost = {
    id: "post1",
    title: "Test",
    subtitle: null,
    content: "Content",
    imageUrl: null,
    authorId: "user1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("createPost", () => {
    it("should create post and set authorId from service parameter", async () => {
      vi.mocked(mockRepository.create).mockResolvedValue(mockPost);
      
      const input = { title: "Test", content: "Content" };
      await service.createPost(input, "user1");
      
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...input,
        subtitle: null,
        imageUrl: null,
        authorId: "user1",
      });
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });

    it("should pass subtitle to repository when provided in createPost", async () => {
      vi.mocked(mockRepository.create).mockResolvedValue({ ...mockPost, subtitle: "My Subtitle" });
      
      const input = { title: "Test", subtitle: "My Subtitle", content: "Content" };
      await service.createPost(input, "user1");
      
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...input,
        subtitle: "My Subtitle",
        imageUrl: null,
        authorId: "user1",
      });
    });

    it("should upload image and save URL if file is provided", async () => {
      vi.mocked(mockStorage.upload).mockResolvedValue("https://image.url");
      vi.mocked(mockRepository.create).mockResolvedValue({ ...mockPost, imageUrl: "https://image.url" });

      const input = { title: "Test", content: "Content" };
      const file = {} as Express.Multer.File;
      
      await service.createPost(input, "user1", file);
      
      expect(mockStorage.upload).toHaveBeenCalledWith(file);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...input,
        subtitle: null,
        imageUrl: "https://image.url",
        authorId: "user1",
      });
    });

    it("should attempt image cleanup if db creation fails after upload", async () => {
      vi.mocked(mockStorage.upload).mockResolvedValue("https://image.url");
      vi.mocked(mockRepository.create).mockRejectedValue(new Error("DB Error"));

      const file = {} as Express.Multer.File;
      
      await expect(service.createPost({ title: "T", content: "C" }, "user1", file)).rejects.toThrow("DB Error");
      
      expect(mockStorage.delete).toHaveBeenCalledWith("https://image.url");
    });
  });

  describe("getPostById", () => {
    it("should return post if found", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockPost);
      const post = await service.getPostById("post1");
      expect(post).toEqual(mockPost);
    });

    it("should throw 404 AppError if not found", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);
      await expect(service.getPostById("post1")).rejects.toThrow(AppError);
      await expect(service.getPostById("post1")).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("updatePost", () => {
    it("should allow owner to update", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(mockRepository.update).mockResolvedValue({ ...mockPost, title: "New" });

      await service.updatePost("post1", "user1", { title: "New" });
      
      expect(mockRepository.update).toHaveBeenCalledWith("post1", { title: "New" });
    });

    it("should allow updating subtitle", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(mockRepository.update).mockResolvedValue({ ...mockPost, subtitle: "Updated Subtitle" });

      await service.updatePost("post1", "user1", { subtitle: "Updated Subtitle" });
      
      expect(mockRepository.update).toHaveBeenCalledWith("post1", { subtitle: "Updated Subtitle" });
    });

    it("should clear subtitle to null when empty string provided", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue({ ...mockPost, subtitle: "Old Subtitle" });
      vi.mocked(mockRepository.update).mockResolvedValue({ ...mockPost, subtitle: null });

      await service.updatePost("post1", "user1", { subtitle: "" });
      
      expect(mockRepository.update).toHaveBeenCalledWith("post1", { subtitle: null });
    });

    it("should reject non-owner with 403 and NOT call update", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockPost); // owner is user1

      await expect(service.updatePost("post1", "hacker", { title: "New" })).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should NOT call image upload if non-owner attempts to upload image", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockPost);

      const file = {} as Express.Multer.File;
      await expect(service.updatePost("post1", "hacker", { title: "New" }, file)).rejects.toMatchObject({ statusCode: 403 });
      
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });

    it("should upload new image, update DB, and delete old image for owner", async () => {
      const postWithImage = { ...mockPost, imageUrl: "https://old.url" };
      vi.mocked(mockRepository.findById).mockResolvedValue(postWithImage);
      vi.mocked(mockStorage.upload).mockResolvedValue("https://new.url");
      vi.mocked(mockRepository.update).mockResolvedValue({ ...postWithImage, imageUrl: "https://new.url" });

      const file = {} as Express.Multer.File;
      await service.updatePost("post1", "user1", { title: "New" }, file);

      expect(mockStorage.upload).toHaveBeenCalledWith(file);
      expect(mockRepository.update).toHaveBeenCalledWith("post1", { title: "New", imageUrl: "https://new.url" });
      expect(mockStorage.delete).toHaveBeenCalledWith("https://old.url");
    });

    it("should delete newly uploaded image if db update fails, keeping old image intact", async () => {
      const postWithImage = { ...mockPost, imageUrl: "https://old.url" };
      vi.mocked(mockRepository.findById).mockResolvedValue(postWithImage);
      vi.mocked(mockStorage.upload).mockResolvedValue("https://new.url");
      vi.mocked(mockRepository.update).mockRejectedValue(new Error("DB Error"));

      const file = {} as Express.Multer.File;
      await expect(service.updatePost("post1", "user1", { title: "New" }, file)).rejects.toThrow("DB Error");

      expect(mockStorage.delete).toHaveBeenCalledWith("https://new.url");
      expect(mockStorage.delete).not.toHaveBeenCalledWith("https://old.url");
    });
  });

  describe("deletePost", () => {
    it("should delete post for owner and clean up image", async () => {
      const postWithImage = { ...mockPost, imageUrl: "https://image.url" };
      vi.mocked(mockRepository.findById).mockResolvedValue(postWithImage);
      vi.mocked(mockRepository.delete).mockResolvedValue(true);

      await service.deletePost("post1", "user1");

      expect(mockRepository.delete).toHaveBeenCalledWith("post1");
      expect(mockStorage.delete).toHaveBeenCalledWith("https://image.url");
    });

    it("should reject non-owner with 403 and NOT call delete", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockPost);

      await expect(service.deletePost("post1", "hacker")).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("pagination", () => {
    it("should pass correct pagination params to findAll", async () => {
      const mockResult = { items: [], page: 2, limit: 10, totalItems: 0, totalPages: 0 };
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockResult);

      await service.getAllPosts({ page: 2, limit: 10 });
      expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });
    
    it("should pass correct pagination params to findByAuthorId", async () => {
      const mockResult = { items: [], page: 1, limit: 10, totalItems: 0, totalPages: 0 };
      vi.mocked(mockRepository.findByAuthorId).mockResolvedValue(mockResult);

      await service.getPostsByAuthor("user1", { page: 1, limit: 10 });
      expect(mockRepository.findByAuthorId).toHaveBeenCalledWith("user1", { page: 1, limit: 10 });
    });
  });
});
