export class ApiError extends Error {
  constructor(public status: number, public message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions extends RequestInit {
  token?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000/api";

async function fetchClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...headers,
    },
  };

  let finalToken = token;
  if (!finalToken && typeof window !== "undefined") {
    finalToken = localStorage.getItem("token") || undefined;
  }

  if (finalToken) {
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${finalToken}`;
  }

  // Automatically set Content-Type to JSON if body is provided and not FormData
  if (customConfig.body && !(customConfig.body instanceof FormData)) {
    (config.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, "Failed to parse API response");
  }

  if (!response.ok) {
    throw new ApiError(response.status, data.message || "An unexpected error occurred");
  }

  return data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: FetchOptions) => 
    fetchClient<T>(endpoint, { ...options, method: "GET" }),
  
  post: <T>(endpoint: string, body: unknown, options?: FetchOptions) => 
    fetchClient<T>(endpoint, { 
      ...options, 
      method: "POST", 
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  
  patch: <T>(endpoint: string, body: unknown, options?: FetchOptions) => 
    fetchClient<T>(endpoint, { 
      ...options, 
      method: "PATCH", 
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  
  delete: <T>(endpoint: string, options?: FetchOptions) => 
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};
