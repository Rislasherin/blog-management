import { apiClient } from "./api-client";
import type { ApiResponse } from "../types/api.types";
import type { Post, CreatePostInput, UpdatePostInput } from "../types/post.types";

export const postService = {
  getAllPosts: async (page = 1, limit = 10): Promise<ApiResponse<Post[]>> => {
    return apiClient.get<ApiResponse<Post[]>>(`/posts?page=${page}&limit=${limit}`);
  },

  getPostsByAuthor: async (authorId: string, page = 1, limit = 10): Promise<ApiResponse<Post[]>> => {
    return apiClient.get<ApiResponse<Post[]>>(`/posts/author/${authorId}?page=${page}&limit=${limit}`);
  },

  getPostById: async (id: string): Promise<ApiResponse<Post>> => {
    return apiClient.get<ApiResponse<Post>>(`/posts/${id}`);
  },

  createPost: async (input: CreatePostInput, token?: string): Promise<ApiResponse<Post>> => {
    const formData = new FormData();
    formData.append("title", input.title);
    if (input.subtitle !== undefined && input.subtitle !== null && input.subtitle.trim() !== "") {
      formData.append("subtitle", input.subtitle.trim());
    }
    formData.append("content", input.content);
    if (input.image) {
      formData.append("image", input.image);
    }

    return apiClient.post<ApiResponse<Post>>("/posts", formData, { token });
  },

  updatePost: async (id: string, input: UpdatePostInput, token?: string): Promise<ApiResponse<Post>> => {
    const formData = new FormData();
    if (input.title !== undefined) formData.append("title", input.title);
    if (input.subtitle !== undefined) formData.append("subtitle", input.subtitle ?? "");
    if (input.content !== undefined) formData.append("content", input.content);
    if (input.image) formData.append("image", input.image);

    return apiClient.patch<ApiResponse<Post>>(`/posts/${id}`, formData, { token });
  },

  deletePost: async (id: string, token?: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<ApiResponse<void>>(`/posts/${id}`, { token });
  },
};
