import { z } from "zod";

export const createPostSchema = z
  .object({
    title: z.string().min(1, "Title is required").trim(),
    subtitle: z
      .string()
      .max(200, "Subtitle cannot exceed 200 characters")
      .trim()
      .optional()
      .nullable(),
    content: z.string().min(1, "Content is required").trim(),
  })
  .strict();

export const updatePostSchema = z
  .object({
    title: z.string().min(1, "Title cannot be empty").trim().optional(),
    subtitle: z
      .string()
      .max(200, "Subtitle cannot exceed 200 characters")
      .trim()
      .optional()
      .nullable(),
    content: z.string().min(1, "Content cannot be empty").trim().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
