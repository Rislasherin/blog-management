import { apiClient } from "./api-client";
import type { ApiResponse } from "../types/api.types";
import type { LoginResponse, RegisterResponse } from "../types/auth.types";

export const authService = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<ApiResponse<LoginResponse>>("/auth/login", { email, password });
  },

  register: async (name: string, email: string, password: string): Promise<ApiResponse<RegisterResponse>> => {
    return apiClient.post<ApiResponse<RegisterResponse>>("/auth/register", { name, email, password });
  },
};
