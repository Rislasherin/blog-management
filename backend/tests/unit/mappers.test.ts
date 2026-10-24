import { describe, it, expect } from "vitest";
import { UserMapper } from "../../src/infrastructure/database/mappers/UserMapper.js";
import { OtpMapper } from "../../src/infrastructure/database/mappers/OtpMapper.js";
import { PostMapper } from "../../src/infrastructure/database/mappers/PostMapper.js";
import type { IUserDocument } from "../../src/infrastructure/database/models/UserModel.js";
import type { IOtpDocument } from "../../src/infrastructure/database/models/OtpModel.js";
import type { IPostDocument } from "../../src/infrastructure/database/models/PostModel.js";

describe("Persistence Mappers Unit Tests", () => {
  it("UserMapper should map MongoDB document to domain User entity", () => {
    const mockDoc = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      name: "John Doe",
      email: "john@example.com",
      password: "hashedPassword123",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    } as unknown as IUserDocument;

    const user = UserMapper.toDomain(mockDoc);

    expect(user.id).toBe("507f1f77bcf86cd799439011");
    expect(user.name).toBe("John Doe");
    expect(user.email).toBe("john@example.com");
    expect(user.password).toBe("hashedPassword123");
  });

  it("OtpMapper should map MongoDB document to domain Otp entity", () => {
    const mockDoc = {
      _id: { toString: () => "507f1f77bcf86cd799439012" },
      email: "otp@example.com",
      purpose: "signup",
      codeHash: "hash123",
      expiresAt: new Date("2026-01-01T12:00:00Z"),
      used: false,
      attempts: 0,
      createdAt: new Date("2026-01-01T11:50:00Z"),
    } as unknown as IOtpDocument;

    const otp = OtpMapper.toDomain(mockDoc);

    expect(otp.id).toBe("507f1f77bcf86cd799439012");
    expect(otp.email).toBe("otp@example.com");
    expect(otp.purpose).toBe("signup");
    expect(otp.canBeUsed(new Date("2026-01-01T11:55:00Z"))).toBe(true);
    expect(otp.canBeUsed(new Date("2026-01-01T12:05:00Z"))).toBe(false);
  });

  it("PostMapper should map MongoDB document to domain Post entity", () => {
    const mockDoc = {
      _id: { toString: () => "507f1f77bcf86cd799439013" },
      title: "Clean Architecture",
      subtitle: "A Craftsman's Guide",
      content: "Software architecture guide",
      imageUrl: "https://example.com/image.jpg",
      authorId: "author-123",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    } as unknown as IPostDocument;

    const post = PostMapper.toDomain(mockDoc);

    expect(post.id).toBe("507f1f77bcf86cd799439013");
    expect(post.title).toBe("Clean Architecture");
    expect(post.subtitle).toBe("A Craftsman's Guide");
    expect(post.isAuthoredBy("author-123")).toBe(true);
    expect(post.isAuthoredBy("other-author")).toBe(false);
  });
});
