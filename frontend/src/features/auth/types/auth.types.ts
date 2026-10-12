export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export type RegisterResponse = User;
