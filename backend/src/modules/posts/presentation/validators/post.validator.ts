import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().trim().min(3).max(150),
  subtitle: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(10).max(10000),
}).strict();

export interface CreatePostInput {
  title: string;
  subtitle?: string | null;
  content: string;
}

export const updatePostSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  subtitle: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(10).max(10000).optional(),
}).strict();

export interface UpdatePostInput {
  title?: string;
  subtitle?: string | null;
  content?: string;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export interface PaginationInput {
  page: number;
  limit: number;
}
