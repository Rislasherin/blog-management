import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostService } from "../../src/application/services/PostService.js";
import type { IPostRepository } from "../../src/domain/repositories/IPostRepository.js";
import type { IPost } from "../../src/domain/entities/Post.js";
import type { IFileStorageService as IImageStorage } from "../../src/application/interfaces/IFileStorageService.js";

describe("Clean Architecture - Application PostService", () => {
  let mockRepository: IPostRepository;
  let mockStorage: IImageStorage;
  let service: PostService;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByAuthorId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockStorage = {
      upload: vi.fn(),
      delete: vi.fn(),
    };

    service = new PostService(mockRepository, mockStorage);
  });

  it("should create post through application service with clean architecture contracts", async () => {
    const mockPost: IPost = {
      id: "clean-post-1",
      title: "Clean Architecture",
      subtitle: "A practical guide",
      content: "Clean architecture decouples domain and infrastructure.",
      imageUrl: null,
      authorId: "user-clean-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepository.create).mockResolvedValue(mockPost);

    const result = await service.createPost(
      {
        title: "Clean Architecture",
        subtitle: "A practical guide",
        content: "Clean architecture decouples domain and infrastructure.",
      },
      "user-clean-1"
    );

    expect(result).toEqual(mockPost);
    expect(mockRepository.create).toHaveBeenCalledWith({
      title: "Clean Architecture",
      subtitle: "A practical guide",
      content: "Clean architecture decouples domain and infrastructure.",
      imageUrl: null,
      authorId: "user-clean-1",
    });
  });
});
