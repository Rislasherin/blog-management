import { describe, it, expect, vi } from "vitest";
import { createContainer } from "../../src/infrastructure/di/container.js";
import { AuthService } from "../../src/application/services/AuthService.js";
import { PostService } from "../../src/application/services/PostService.js";
import { AuthController } from "../../src/presentation/http/controllers/AuthController.js";
import { PostController } from "../../src/presentation/http/controllers/PostController.js";
import type { IUserRepository } from "../../src/domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../src/domain/repositories/IOtpRepository.js";
import type { ITokenService } from "../../src/application/interfaces/ITokenService.js";
import type { IEmailService } from "../../src/application/interfaces/IEmailService.js";
import type { IPasswordHasher } from "../../src/application/interfaces/IPasswordHasher.js";
import type { IPostRepository } from "../../src/domain/repositories/IPostRepository.js";
import type { IFileStorageService as IImageStorage } from "../../src/application/interfaces/IFileStorageService.js";
import type { ILogger } from "../../src/application/interfaces/ILogger.js";

describe("Direct Composition & Dependency Injection Tests", () => {
  const mockUserRepo = {} as IUserRepository;
  const mockOtpRepo = {} as IOtpRepository;
  const mockTokenService = { generateAccessToken: vi.fn(), verifyAccessToken: vi.fn() } as unknown as ITokenService;
  const mockEmailService = {} as IEmailService;
  const mockPasswordHasher = { hash: vi.fn(), compare: vi.fn() } as unknown as IPasswordHasher;
  const mockPostRepo = {} as IPostRepository;
  const mockImageStorage = {} as IImageStorage;
  const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as unknown as ILogger;

  it("createContainer should assemble the full dependency graph with overrides", () => {
    const container = createContainer({
      userRepository: mockUserRepo,
      otpRepository: mockOtpRepo,
      tokenService: mockTokenService,
      emailService: mockEmailService,
      passwordHasher: mockPasswordHasher,
      postRepository: mockPostRepo,
      imageStorage: mockImageStorage,
      logger: mockLogger,
    });

    expect(container.userRepository).toBe(mockUserRepo);
    expect(container.postRepository).toBe(mockPostRepo);
    expect(container.tokenService).toBe(mockTokenService);
    expect(container.emailService).toBe(mockEmailService);
    expect(container.passwordHasher).toBe(mockPasswordHasher);
    expect(container.imageStorage).toBe(mockImageStorage);
    expect(container.logger).toBe(mockLogger);

    expect(container.registerUserUseCase).toBeDefined();
    expect(container.verifyOtpUseCase).toBeDefined();
    expect(container.loginUseCase).toBeDefined();
    expect(container.requestPasswordResetUseCase).toBeDefined();
    expect(container.verifyResetOtpUseCase).toBeDefined();
    expect(container.resetPasswordUseCase).toBeDefined();

    expect(container.createPostUseCase).toBeDefined();
    expect(container.getAllPostsUseCase).toBeDefined();
    expect(container.getPostByIdUseCase).toBeDefined();
    expect(container.getPostsByAuthorUseCase).toBeDefined();
    expect(container.updatePostUseCase).toBeDefined();
    expect(container.deletePostUseCase).toBeDefined();

    expect(container.authService).toBeDefined();
    expect(container.postService).toBeDefined();
    expect(container.authController).toBeDefined();
    expect(container.postController).toBeDefined();
    expect(container.authRouter).toBeDefined();
    expect(container.postRouter).toBeDefined();
  });

  it("should construct AuthService and PostService with constructor injection", () => {
    const container = createContainer({
      userRepository: mockUserRepo,
      otpRepository: mockOtpRepo,
      tokenService: mockTokenService,
      emailService: mockEmailService,
      passwordHasher: mockPasswordHasher,
      postRepository: mockPostRepo,
      imageStorage: mockImageStorage,
      logger: mockLogger,
    });

    const authService = new AuthService(
      container.registerUserUseCase,
      container.verifyOtpUseCase,
      container.loginUseCase,
      container.requestPasswordResetUseCase,
      container.verifyResetOtpUseCase,
      container.resetPasswordUseCase
    );

    const postService = new PostService(
      container.createPostUseCase,
      container.getAllPostsUseCase,
      container.getPostByIdUseCase,
      container.getPostsByAuthorUseCase,
      container.updatePostUseCase,
      container.deletePostUseCase
    );

    expect(authService).toBeDefined();
    expect(postService).toBeDefined();
  });

  it("should construct AuthController and PostController with discrete use cases", () => {
    const container = createContainer({
      userRepository: mockUserRepo,
      otpRepository: mockOtpRepo,
      tokenService: mockTokenService,
      emailService: mockEmailService,
      passwordHasher: mockPasswordHasher,
      postRepository: mockPostRepo,
      imageStorage: mockImageStorage,
      logger: mockLogger,
    });

    const authController = new AuthController({
      registerUserUseCase: container.registerUserUseCase,
      loginUseCase: container.loginUseCase,
      verifyOtpUseCase: container.verifyOtpUseCase,
      requestPasswordResetUseCase: container.requestPasswordResetUseCase,
      verifyResetOtpUseCase: container.verifyResetOtpUseCase,
      resetPasswordUseCase: container.resetPasswordUseCase,
      logger: mockLogger,
    });

    const postController = new PostController({
      createPostUseCase: container.createPostUseCase,
      getAllPostsUseCase: container.getAllPostsUseCase,
      getPostByIdUseCase: container.getPostByIdUseCase,
      getPostsByAuthorUseCase: container.getPostsByAuthorUseCase,
      updatePostUseCase: container.updatePostUseCase,
      deletePostUseCase: container.deletePostUseCase,
    });

    expect(authController).toBeDefined();
    expect(postController).toBeDefined();
    expect(typeof authController.login).toBe("function");
    expect(typeof postController.createPost).toBe("function");
  });
});
