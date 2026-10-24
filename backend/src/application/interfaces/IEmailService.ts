export interface IEmailService {
  sendOtp(email: string, code: string): Promise<void>;
  verifyConnection(): Promise<{ success: boolean; message: string }>;
}

export default IEmailService;
