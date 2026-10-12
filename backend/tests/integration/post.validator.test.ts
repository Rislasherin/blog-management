import { describe, it, expect } from "vitest";
import { createPostSchema, updatePostSchema, paginationSchema } from "../../src/modules/posts/post.validator.js";

describe("Validation", () => {
  describe("createPostSchema", () => {
    it("should accept valid input", () => {
      const result = createPostSchema.safeParse({ title: "Valid Title", content: "Valid content string!" });
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const result = createPostSchema.safeParse({ title: "Valid Title" });
      expect(result.success).toBe(false);
    });

    it("should accept valid input with optional subtitle", () => {
      const result = createPostSchema.safeParse({ title: "Valid Title", subtitle: "Optional Subtitle", content: "Valid content string!" });
      expect(result.success).toBe(true);
    });

    it("should reject subtitle exceeding 200 characters in createPostSchema", () => {
      const result = createPostSchema.safeParse({
        title: "Valid Title",
        subtitle: "a".repeat(201),
        content: "Valid content string!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject unknown fields like authorId", () => {
      const result = createPostSchema.safeParse({ title: "Valid Title", content: "Valid content string!", authorId: "hacker" });
      expect(result.success).toBe(false);
    });
  });

  describe("updatePostSchema", () => {
    it("should accept partial valid input", () => {
      const result = updatePostSchema.safeParse({ title: "New Title" });
      expect(result.success).toBe(true);
    });

    it("should accept subtitle in updatePostSchema", () => {
      const result = updatePostSchema.safeParse({ subtitle: "Updated Subtitle" });
      expect(result.success).toBe(true);
    });

    it("should accept empty or null subtitle in updatePostSchema to clear it", () => {
      const emptyRes = updatePostSchema.safeParse({ subtitle: "" });
      expect(emptyRes.success).toBe(true);
      const nullRes = updatePostSchema.safeParse({ subtitle: null });
      expect(nullRes.success).toBe(true);
    });

    it("should reject subtitle exceeding 200 characters in updatePostSchema", () => {
      const result = updatePostSchema.safeParse({ subtitle: "a".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("should reject unknown fields", () => {
      const result = updatePostSchema.safeParse({ id: "123", authorId: "hacker" });
      expect(result.success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("should parse and coerce strings to numbers with defaults", () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, limit: 10 });
      }
    });

    it("should reject invalid negative page", () => {
      const result = paginationSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject limit > 50", () => {
      const result = paginationSchema.safeParse({ limit: 51 });
      expect(result.success).toBe(false);
    });

    it("should reject NaN string", () => {
      const result = paginationSchema.safeParse({ page: "abc" });
      expect(result.success).toBe(false);
    });
  });
});
