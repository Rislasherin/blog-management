export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface ITokenService {
  generateAccessToken(payload: AuthTokenPayload): string;
  verifyAccessToken(token: string): AuthTokenPayload;
}

export default ITokenService;
