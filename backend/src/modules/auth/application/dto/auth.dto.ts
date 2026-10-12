export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponseDTO {
  user: AuthResponseUser;
  accessToken: string;
}
