import { apiClient } from "@/lib/api/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { LoginResponse, VerifyOtpPayload } from "../types/auth.types";

export const authService = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<ApiResponse<LoginResponse>>("/auth/login", { email, password });
  },

  register: async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>("/auth/register", { name, email, password });
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<ApiResponse<{ id: string; name: string; email: string }>> => {
    return apiClient.post<ApiResponse<{ id: string; name: string; email: string }>>("/auth/verify-otp", payload);
  },
};
