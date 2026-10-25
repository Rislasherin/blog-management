import type { RequestHandler, Router } from "express";

// Infrastructure implementations
import { MongoUserRepository } from "../database/repositories/MongoUserRepository.js";
import { MongoOtpRepository } from "../database/repositories/MongoOtpRepository.js";
import { MongoPostRepository } from "../database/repositories/MongoPostRepository.js";
import { JwtTokenService } from "../security/JwtTokenService.js";
import { BcryptPasswordHasher } from "../security/BcryptPasswordHasher.js";
import { NodemailerEmailService } from "../email/NodemailerEmailService.js";
import { CloudinaryStorageService } from "../storage/CloudinaryStorageService.js";
import { logger as defaultLogger } from "../logging/PinoLogger.js";

// Domain repository interfaces
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IOtpRepository } from "../../domain/repositories/IOtpRepository.js";
import type { IPostRepository } from "../../domain/repositories/IPostRepository.js";

// Application service interfaces
import type { ITokenService } from "../../application/interfaces/ITokenService.js";
import type { IEmailService } from "../../application/interfaces/IEmailService.js";
import type { IPasswordHasher } from "../../application/interfaces/IPasswordHasher.js";
import type { IFileStorageService } from "../../application/interfaces/IFileStorageService.js";
import type { ILogger } from "../../application/interfaces/ILogger.js";

// Application use cases
import { RegisterUserUseCase } from "../../application/use-cases/auth/implementations/RegisterUserUseCase.js";
import type { IRegisterUserUseCase } from "../../application/use-cases/auth/interfaces/IRegisterUserUseCase.js";
import { VerifyOtpUseCase } from "../../application/use-cases/auth/implementations/VerifyOtpUseCase.js";
import type { IVerifyOtpUseCase } from "../../application/use-cases/auth/interfaces/IVerifyOtpUseCase.js";
import { ResendOtpUseCase } from "../../application/use-cases/auth/implementations/ResendOtpUseCase.js";
import type { IResendOtpUseCase } from "../../application/use-cases/auth/interfaces/IResendOtpUseCase.js";
import { LoginUseCase } from "../../application/use-cases/auth/implementations/LoginUseCase.js";
import type { ILoginUseCase } from "../../application/use-cases/auth/interfaces/ILoginUseCase.js";
import { RequestPasswordResetUseCase } from "../../application/use-cases/auth/implementations/RequestPasswordResetUseCase.js";
import type { IRequestPasswordResetUseCase } from "../../application/use-cases/auth/interfaces/IRequestPasswordResetUseCase.js";
import { VerifyResetOtpUseCase } from "../../application/use-cases/auth/implementations/VerifyResetOtpUseCase.js";
import type { IVerifyResetOtpUseCase } from "../../application/use-cases/auth/interfaces/IVerifyResetOtpUseCase.js";
import { ResetPasswordUseCase } from "../../application/use-cases/auth/implementations/ResetPasswordUseCase.js";
import type { IResetPasswordUseCase } from "../../application/use-cases/auth/interfaces/IResetPasswordUseCase.js";

import { CreatePostUseCase } from "../../application/use-cases/posts/implementations/CreatePostUseCase.js";
import type { ICreatePostUseCase } from "../../application/use-cases/posts/interfaces/ICreatePostUseCase.js";
import { GetPostsUseCase } from "../../application/use-cases/posts/implementations/GetPostsUseCase.js";
import type { IGetPostsUseCase, IGetAllPostsUseCase } from "../../application/use-cases/posts/interfaces/IGetPostsUseCase.js";
import { GetPostByIdUseCase } from "../../application/use-cases/posts/implementations/GetPostByIdUseCase.js";
import type { IGetPostByIdUseCase } from "../../application/use-cases/posts/interfaces/IGetPostByIdUseCase.js";
import { GetPostsByAuthorUseCase } from "../../application/use-cases/posts/implementations/GetPostsByAuthorUseCase.js";
import type { IGetPostsByAuthorUseCase } from "../../application/use-cases/posts/interfaces/IGetPostsByAuthorUseCase.js";
import { UpdatePostUseCase } from "../../application/use-cases/posts/implementations/UpdatePostUseCase.js";
import type { IUpdatePostUseCase } from "../../application/use-cases/posts/interfaces/IUpdatePostUseCase.js";
import { DeletePostUseCase } from "../../application/use-cases/posts/implementations/DeletePostUseCase.js";
import type { IDeletePostUseCase } from "../../application/use-cases/posts/interfaces/IDeletePostUseCase.js";

// Application composite services
import { AuthService } from "../../application/services/AuthService.js";
import { PostService } from "../../application/services/PostService.js";
import type { IAuthService } from "../../application/services/IAuthService.js";
import type { IPostService } from "../../application/services/IPostService.js";

// Presentation controllers, routes, and middleware
import { AuthController } from "../../presentation/http/controllers/AuthController.js";
import { PostController } from "../../presentation/http/controllers/PostController.js";
import { createAuthRouter } from "../../presentation/http/routes/auth.routes.js";
import { createPostRouter } from "../../presentation/http/routes/post.routes.js";
import { createAuthMiddleware } from "../../presentation/http/middleware/auth.middleware.js";

export interface ContainerDependencies {
  userRepository?: IUserRepository;
  otpRepository?: IOtpRepository;
  postRepository?: IPostRepository;
  tokenService?: ITokenService;
  emailService?: IEmailService;
  passwordHasher?: IPasswordHasher;
  imageStorage?: IFileStorageService;
  logger?: ILogger;
  authService?: IAuthService;
  postService?: IPostService;
  authController?: AuthController;
  postController?: PostController;
  authMiddleware?: RequestHandler;
}

export interface Container {
  // Repositories & Adapters
  userRepository: IUserRepository;
  otpRepository: IOtpRepository;
  postRepository: IPostRepository;
  tokenService: ITokenService;
  passwordHasher: IPasswordHasher;
  emailService: IEmailService;
  imageStorage: IFileStorageService;
  logger: ILogger;

  // Use Cases
  registerUserUseCase: IRegisterUserUseCase;
  verifyOtpUseCase: IVerifyOtpUseCase;
  resendOtpUseCase: IResendOtpUseCase;
  loginUseCase: ILoginUseCase;
  requestPasswordResetUseCase: IRequestPasswordResetUseCase;
  verifyResetOtpUseCase: IVerifyResetOtpUseCase;
  resetPasswordUseCase: IResetPasswordUseCase;

  createPostUseCase: ICreatePostUseCase;
  getAllPostsUseCase: IGetAllPostsUseCase;
  getPostByIdUseCase: IGetPostByIdUseCase;
  getPostsByAuthorUseCase: IGetPostsByAuthorUseCase;
  updatePostUseCase: IUpdatePostUseCase;
  deletePostUseCase: IDeletePostUseCase;

  // Composite Services
  authService: IAuthService;
  postService: IPostService;

  // Presentation
  authController: AuthController;
  postController: PostController;
  authMiddleware: RequestHandler;
  authRouter: Router;
  postRouter: Router;
}

/**
 * Composition Root / Dependency Injection Container:
 * Wires concrete infrastructure adapters, application use cases, presentation controllers,
 * and HTTP routers using direct constructor dependency injection.
 */
export const createContainer = (overrides?: ContainerDependencies): Container => {
  // 1. Infrastructure Layer
  const logger = overrides?.logger ?? defaultLogger;
  const userRepository = overrides?.userRepository ?? new MongoUserRepository();
  const otpRepository = overrides?.otpRepository ?? new MongoOtpRepository();
  const postRepository = overrides?.postRepository ?? new MongoPostRepository();
  const tokenService = overrides?.tokenService ?? new JwtTokenService();
  const passwordHasher = overrides?.passwordHasher ?? new BcryptPasswordHasher();
  const emailService = overrides?.emailService ?? new NodemailerEmailService();
  const imageStorage = overrides?.imageStorage ?? new CloudinaryStorageService();

  // 2. Application Layer Use Cases
  const registerUserUseCase = new RegisterUserUseCase(userRepository, otpRepository, emailService, passwordHasher);
  const verifyOtpUseCase = new VerifyOtpUseCase(userRepository, otpRepository, passwordHasher);
  const resendOtpUseCase = new ResendOtpUseCase(userRepository, otpRepository, emailService, passwordHasher);
  const loginUseCase = new LoginUseCase(userRepository, tokenService, passwordHasher);
  const requestPasswordResetUseCase = new RequestPasswordResetUseCase(userRepository, otpRepository, emailService, passwordHasher);
  const verifyResetOtpUseCase = new VerifyResetOtpUseCase(otpRepository, tokenService, passwordHasher);
  const resetPasswordUseCase = new ResetPasswordUseCase(userRepository, otpRepository, tokenService, passwordHasher);

  const createPostUseCase = new CreatePostUseCase(postRepository, imageStorage, logger);
  const getAllPostsUseCase = new GetPostsUseCase(postRepository);
  const getPostByIdUseCase = new GetPostByIdUseCase(postRepository);
  const getPostsByAuthorUseCase = new GetPostsByAuthorUseCase(postRepository);
  const updatePostUseCase = new UpdatePostUseCase(postRepository, imageStorage, logger);
  const deletePostUseCase = new DeletePostUseCase(postRepository, imageStorage);

  const authService =
    overrides?.authService ??
    new AuthService(
      registerUserUseCase,
      verifyOtpUseCase,
      loginUseCase,
      requestPasswordResetUseCase,
      verifyResetOtpUseCase,
      resetPasswordUseCase
    );

  const postService =
    overrides?.postService ??
    new PostService(
      createPostUseCase,
      getAllPostsUseCase,
      getPostByIdUseCase,
      getPostsByAuthorUseCase,
      updatePostUseCase,
      deletePostUseCase
    );

  // 3. Presentation Layer
  const authController =
    overrides?.authController ??
    new AuthController({
      registerUserUseCase,
      loginUseCase,
      verifyOtpUseCase,
      resendOtpUseCase,
      requestPasswordResetUseCase,
      verifyResetOtpUseCase,
      resetPasswordUseCase,
      logger,
    });

  const postController =
    overrides?.postController ??
    new PostController({
      createPostUseCase,
      getAllPostsUseCase,
      getPostByIdUseCase,
      getPostsByAuthorUseCase,
      updatePostUseCase,
      deletePostUseCase,
    });

  const authMiddleware =
    overrides?.authMiddleware ?? createAuthMiddleware(tokenService);

  const authRouter = createAuthRouter(authController);
  const postRouter = createPostRouter(postController, authMiddleware);

  return {
    userRepository,
    otpRepository,
    postRepository,
    tokenService,
    passwordHasher,
    emailService,
    imageStorage,
    logger,

    registerUserUseCase,
    verifyOtpUseCase,
    resendOtpUseCase,
    loginUseCase,
    requestPasswordResetUseCase,
    verifyResetOtpUseCase,
    resetPasswordUseCase,

    createPostUseCase,
    getAllPostsUseCase,
    getPostByIdUseCase,
    getPostsByAuthorUseCase,
    updatePostUseCase,
    deletePostUseCase,

    authService,
    postService,
    authController,
    postController,
    authMiddleware,
    authRouter,
    postRouter,
  };
};

export const defaultContainer = createContainer();
export default defaultContainer;
