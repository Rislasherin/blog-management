export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: Record<string, string[] | undefined>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions extends RequestInit {
  token?: string;
}

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000/api";
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

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

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, "Failed to parse API response");
  }

  if (!response.ok) {
    const errorMsg = data && typeof data === "object" && "message" in data ? String(data.message) : "An unexpected error occurred";
    const errors = data && typeof data === "object" && "errors" in data ? (data.errors as Record<string, string[] | undefined>) : undefined;
    throw new ApiError(response.status, errorMsg, errors);
  }

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    const errorMsg = "message" in data ? String(data.message) : "Request failed";
    const errors = "errors" in data ? (data.errors as Record<string, string[] | undefined>) : undefined;
    throw new ApiError(response.status || 400, errorMsg, errors);
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
