import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import logger from "../../logger/logger.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { IEmailService } from "./auth.types.js";

export class EmailService implements IEmailService {
  private transporter: Transporter | null = null;

  constructor(customTransporter?: Transporter | null) {
    if (customTransporter !== undefined) {
      this.transporter = customTransporter;
    } else if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      const isSecure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : env.SMTP_PORT === 465;
      const cleanPass = env.SMTP_PASS.replace(/\s+/g, "");

      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: isSecure,
        auth: {
          user: env.SMTP_USER,
          pass: cleanPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });
    }
  }

  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return {
        success: false,
        message:
          "SMTP transporter is not initialized. Please verify SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.",
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: "SMTP server connection and credentials verified successfully.",
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `SMTP connection verification failed: ${errorMessage}`,
      };
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      logger.error({
        msg: "Cannot send OTP email: SMTP is not configured in backend/.env",
        hasHost: Boolean(env.SMTP_HOST),
        hasUser: Boolean(env.SMTP_USER),
        hasPass: Boolean(env.SMTP_PASS),
      });
      throw new AppError(
        500,
        "Email delivery is not configured on the server. Please check your SMTP settings in backend/.env."
      );
    }

    try {
      const fromAddress = env.EMAIL_FROM.includes("<")
        ? env.EMAIL_FROM
        : `BlogPlatform <${env.EMAIL_FROM}>`;

      const mailOptions = {
        from: fromAddress,
        to: email,
        subject: "Your BlogPlatform Verification Code",
        text: `Hello,\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this verification code, please ignore this email.\n\nBest regards,\nBlogPlatform Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 12px;">BlogPlatform Verification</h2>
            <p style="color: #4b5563; font-size: 15px; line-height: 24px; margin-bottom: 24px;">Please use the following 6-digit verification code to complete your verification request:</p>
            <div style="background-color: #f3f4f6; padding: 18px; text-align: center; border-radius: 8px; letter-spacing: 6px; font-size: 32px; font-weight: 700; color: #1f2937; font-family: monospace; margin-bottom: 24px;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 20px;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info({
        msg: "OTP verification email dispatched successfully",
        recipient: email,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({
        msg: "Failed to dispatch verification email via SMTP",
        recipient: email,
        error: errorMessage,
      });
      throw new AppError(
        500,
        "Failed to deliver verification email. Please check your email address or SMTP configuration."
      );
    }
  }
}

export default EmailService;
