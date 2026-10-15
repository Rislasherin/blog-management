import logger from "../../logger/logger.js";

export class EmailService {
  async sendOtp(email: string, code: string): Promise<void> {
    // In production, integrate with provider (SES, SendGrid, Resend, etc.)
    logger.info(`Sending OTP ${code} to ${email}`);
  }
}

export default EmailService;
