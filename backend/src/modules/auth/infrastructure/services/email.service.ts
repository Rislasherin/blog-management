import { logger } from '../../../../infrastructure/logger/logger.js';

export class EmailService {
  async sendOtp(email: string, code: string): Promise<void> {
    // In production, integrate with an email provider (e.g., SendGrid, SES).
    // For now, we simply log the OTP for debugging purposes.
    logger.info(`Sending OTP ${code} to ${email}`);
  }
}
