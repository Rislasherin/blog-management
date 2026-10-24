import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthController } from "../../src/presentation/http/controllers/AuthController.js";
import { PostController } from "../../src/presentation/http/controllers/PostController.js";
import type { IRegisterUserUseCase } from "../../src/application/use-cases/auth/interfaces/IRegisterUserUseCase.js";
import type { ILoginUseCase } from "../../src/application/use-cases/auth/interfaces/ILoginUseCase.js";
import type { IVerifyOtpUseCase } from "../../src/application/use-cases/auth/interfaces/IVerifyOtpUseCase.js";
import type { IRequestPasswordResetUseCase } from "../../src/application/use-cases/auth/interfaces/IRequestPasswordResetUseCase.js";
import type { IVerifyResetOtpUseCase } from "../../src/application/use-cases/auth/interfaces/IVerifyResetOtpUseCase.js";
import type { IResetPasswordUseCase } from "../../src/application/use-cases/auth/interfaces/IResetPasswordUseCase.js";
import type { ICreatePostUseCase } from "../../src/application/use-cases/posts/interfaces/ICreatePostUseCase.js";
import type { IGetAllPostsUseCase } from "../../src/application/use-cases/posts/interfaces/IGetPostsUseCase.js";
import type { IGetPostByIdUseCase } from "../../src/application/use-cases/posts/interfaces/IGetPostByIdUseCase.js";
import type { IGetPostsByAuthorUseCase } from "../../src/application/use-cases/posts/interfaces/IGetPostsByAuthorUseCase.js";
import type { IUpdatePostUseCase } from "../../src/application/use-cases/posts/interfaces/IUpdatePostUseCase.js";
import type { IDeletePostUseCase } from "../../src/application/use-cases/posts/interfaces/IDeletePostUseCase.js";
import type { ILogger } from "../../src/application/interfaces/ILogger.js";
import type { Request, Response, NextFunction } from "express";

describe("Controllers Unit Tests (Clean Architecture Use-Case Injection)", () => {
  const mockLogger: ILogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  const createMockRes = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  describe("AuthController", () => {
    let registerUserUseCase: IRegisterUserUseCase;
    let loginUseCase: ILoginUseCase;
    let verifyOtpUseCase: IVerifyOtpUseCase;
    let requestPasswordResetUseCase: IRequestPasswordResetUseCase;
    let verifyResetOtpUseCase: IVerifyResetOtpUseCase;
    let resetPasswordUseCase: IResetPasswordUseCase;
    let controller: AuthController;

    beforeEach(() => {
      registerUserUseCase = { execute: vi.fn().mockResolvedValue({ success: true, message: "OTP sent" }) };
      loginUseCase = { execute: vi.fn().mockResolvedValue({ user: { id: "u1", name: "User", email: "u@test.com" }, accessToken: "tok" }) };
      verifyOtpUseCase = { execute: vi.fn().mockResolvedValue({ id: "u1", name: "User", email: "u@test.com" }) };
      requestPasswordResetUseCase = { execute: vi.fn().mockResolvedValue({ success: true, message: "Reset code sent" }) };
      verifyResetOtpUseCase = { execute: vi.fn().mockResolvedValue({ success: true, message: "Verified", resetToken: "tok-reset" }) };
      resetPasswordUseCase = { execute: vi.fn().mockResolvedValue({ success: true, message: "Password reset" }) };

      controller = new AuthController(
        {
          registerUserUseCase,
          loginUseCase,
          verifyOtpUseCase,
          requestPasswordResetUseCase,
          verifyResetOtpUseCase,
          resetPasswordUseCase,
          logger: mockLogger,
        },
        mockLogger
      );
    });

    it("register() should delegate to registerUserUseCase and return 201", async () => {
      const req = { body: { name: "Bob", email: "bob@example.com", password: "Pass" } } as Request<any, any, any>;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.register(req, res, next);

      expect(registerUserUseCase.execute).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: "OTP sent" });
    });

    it("login() should delegate to loginUseCase and return 200 with formatted response", async () => {
      const req = { body: { email: "bob@example.com", password: "Pass" } } as Request<any, any, any>;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.login(req, res, next);

      expect(loginUseCase.execute).toHaveBeenCalledWith({ email: "bob@example.com", password: "Pass" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Login successful",
        data: { user: { id: "u1", name: "User", email: "u@test.com" }, accessToken: "tok" },
      });
    });

    it("verifyOtp() should delegate to verifyOtpUseCase and return 200 with user data", async () => {
      const req = { body: { email: "bob@example.com", code: "123456", name: "Bob", password: "Pass" } } as Request<any, any, any>;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.verifyOtp(req, res, next);

      expect(verifyOtpUseCase.execute).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Account verified and created",
        data: { id: "u1", name: "User", email: "u@test.com" },
      });
    });

    it("resendOtp() should delegate to resendOtpUseCase and return 200", async () => {
      const resendOtpUseCase = { execute: vi.fn().mockResolvedValue({ success: true, message: "OTP resent" }) };
      const ctrl = new AuthController({
        registerUserUseCase,
        loginUseCase,
        verifyOtpUseCase,
        resendOtpUseCase,
        requestPasswordResetUseCase,
        verifyResetOtpUseCase,
        resetPasswordUseCase,
      });

      const req = { body: { email: "bob@example.com" } } as Request<any, any, any>;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await ctrl.resendOtp(req, res, next);

      expect(resendOtpUseCase.execute).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: "OTP resent" });
    });
  });

  describe("PostController", () => {
    let createPostUseCase: ICreatePostUseCase;
    let getAllPostsUseCase: IGetAllPostsUseCase;
    let getPostByIdUseCase: IGetPostByIdUseCase;
    let getPostsByAuthorUseCase: IGetPostsByAuthorUseCase;
    let updatePostUseCase: IUpdatePostUseCase;
    let deletePostUseCase: IDeletePostUseCase;
    let controller: PostController;

    const mockPost = {
      id: "p1",
      title: "Title",
      subtitle: null,
      content: "Content",
      imageUrl: null,
      authorId: "u1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      createPostUseCase = { execute: vi.fn().mockResolvedValue(mockPost) };
      getAllPostsUseCase = {
        execute: vi.fn().mockResolvedValue({
          items: [mockPost],
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
        }),
      };
      getPostByIdUseCase = { execute: vi.fn().mockResolvedValue(mockPost) };
      getPostsByAuthorUseCase = {
        execute: vi.fn().mockResolvedValue({
          items: [mockPost],
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
        }),
      };
      updatePostUseCase = { execute: vi.fn().mockResolvedValue(mockPost) };
      deletePostUseCase = { execute: vi.fn().mockResolvedValue(undefined) };

      controller = new PostController({
        createPostUseCase,
        getAllPostsUseCase,
        getPostByIdUseCase,
        getPostsByAuthorUseCase,
        updatePostUseCase,
        deletePostUseCase,
      });
    });

    it("createPost() should delegate to createPostUseCase with user id and return 201", async () => {
      const req = {
        user: { id: "u1", email: "u1@test.com" },
        body: { title: "Title", content: "Content" },
      } as any;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.createPost(req, res, next);

      expect(createPostUseCase.execute).toHaveBeenCalledWith(req.body, "u1", undefined);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Post created successfully",
        data: mockPost,
      });
    });

    it("getAllPosts() should delegate to getAllPostsUseCase and format paginated response", async () => {
      const req = { query: { page: "1", limit: "10" } } as any;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.getAllPosts(req, res, next);

      expect(getAllPostsUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [mockPost],
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
        },
      });
    });

    it("getPostById() should delegate to getPostByIdUseCase and return post", async () => {
      const req = { params: { id: "p1" } } as any;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.getPostById(req, res, next);

      expect(getPostByIdUseCase.execute).toHaveBeenCalledWith("p1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPost,
      });
    });

    it("deletePost() should delegate to deletePostUseCase and return 200 message", async () => {
      const req = {
        params: { id: "p1" },
        user: { id: "u1", email: "u1@test.com" },
      } as any;
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await controller.deletePost(req, res, next);

      expect(deletePostUseCase.execute).toHaveBeenCalledWith("p1", "u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Post deleted successfully",
      });
    });
  });
});
