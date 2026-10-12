import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { PostModel } from "../../src/modules/posts/post.model.js";
import dotenv from "dotenv";
process.env.JWT_SECRET = "your_super_secret_jwt_key_here";

import type { IPost } from "../../src/modules/posts/types/post.types.js";

vi.mock("../../src/modules/posts/services/cloudinary-image.storage.js", () => {
  return {
    CloudinaryImageStorage: class {
      upload = vi.fn().mockResolvedValue("https://mock-image.url/test.jpg");
      delete = vi.fn().mockResolvedValue(undefined);
    }
  };
});

vi.mock("../../src/modules/posts/infrastructure/storage/cloudinary-image.storage.js", () => {
  return {
    CloudinaryImageStorage: class {
      upload = vi.fn().mockResolvedValue("https://mock-image.url/test.jpg");
      delete = vi.fn().mockResolvedValue(undefined);
    }
  };
});

const { MockMongoPostRepository } = vi.hoisted(() => {
  class MockMongoPostRepository {
    posts: IPost[] = [];
    async create(data: { title: string; subtitle?: string | null; content: string; imageUrl?: string | null; authorId: string }) {
      const post: IPost = { id: Math.random().toString(), subtitle: null, imageUrl: null, ...data, createdAt: new Date(), updatedAt: new Date() };
      this.posts.push(post);
      return post;
    }
    async findById(id: string) {
      return this.posts.find(p => p.id === id) || null;
    }
    async update(id: string, data: { title?: string; subtitle?: string | null; content?: string; imageUrl?: string | null }) {
      const index = this.posts.findIndex(p => p.id === id);
      if (index === -1) return null;
      this.posts[index] = { ...this.posts[index], ...data } as IPost;
      return this.posts[index];
    }
    async delete(id: string) {
      const index = this.posts.findIndex(p => p.id === id);
      if (index === -1) return false;
      this.posts.splice(index, 1);
      return true;
    }
    async findAll(pagination: { page: number; limit: number }) {
      return { items: this.posts, page: pagination.page || 1, limit: pagination.limit || 10, totalItems: this.posts.length, totalPages: 1 };
    }
    async findByAuthorId(authorId: string, pagination: { page: number; limit: number }) {
      const filtered = this.posts.filter(p => p.authorId === authorId);
      return { items: filtered, page: pagination.page || 1, limit: pagination.limit || 10, totalItems: filtered.length, totalPages: 1 };
    }
  }
  return { MockMongoPostRepository };
});

vi.mock("../../src/modules/posts/repositories/mongo-post.repository.js", () => {
  return {
    MongoPostRepository: MockMongoPostRepository
  };
});

vi.mock("../../src/modules/posts/infrastructure/persistence/repositories/mongo-post.repository.js", () => {
  return {
    MongoPostRepository: MockMongoPostRepository
  };
});

const generateToken = (userId: string) => {
  return jwt.sign({ sub: userId, email: "test@test.com" }, process.env.JWT_SECRET || "your_super_secret_jwt_key_here", { expiresIn: "1h" });
};

describe("Post Routes Integration", () => {
  let tokenA: string;
  let tokenB: string;
  let postId: string;

  beforeAll(() => {
    tokenA = generateToken("userA_id");
    tokenB = generateToken("userB_id");
  });

  it("should block unauthenticated POST", async () => {
    const res = await request(app).post("/api/posts").send({ title: "T", content: "C" });
    expect(res.status).toBe(401);
  });

  it("should create post for authenticated user without image", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Post A", content: "This is a valid content string!" });

    if (res.status === 500) throw new Error(JSON.stringify(res.body));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authorId).toBe("userA_id");
    postId = res.body.data.id;
  });

  it("should reject non-owner UPDATE", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "Hacked" });
    
    expect(res.status).toBe(403);
  });

  it("should allow owner to UPDATE", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Updated Title", subtitle: "My New Subtitle" });
    
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
    expect(res.body.data.subtitle).toBe("My New Subtitle");
  });

  it("should handle valid multipart image upload for owner", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("title", "Image Post")
      .field("content", "Has an image")
      .attach("image", Buffer.from("fake_image"), { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(201);
    expect(res.body.data.imageUrl).toBe("https://mock-image.url/test.jpg");
  });

  it("should reject invalid file types (PDF)", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("title", "PDF Post")
      .field("content", "Has a pdf")
      .attach("image", Buffer.from("fake_pdf"), { filename: "test.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400); 
  });

  it("should retrieve paginated list (public)", async () => {
    const res = await request(app).get("/api/posts?page=1&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 10
    });
  });

  it("should reject non-owner DELETE", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    
    expect(res.status).toBe(403);
  });

  it("should allow owner to DELETE", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Post deleted successfully");
    
    const check = await request(app).get(`/api/posts/${postId}`);
    expect(check.status).toBe(404);
  });
});
