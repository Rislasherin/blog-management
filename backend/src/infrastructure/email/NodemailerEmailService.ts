import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import logger from "../logging/PinoLogger.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import type { IEmailService } from "../../application/interfaces/IEmailService.js";
import { renderOtpEmailHtml, renderOtpEmailText } from "./templates/otp-email.template.js";

export class NodemailerEmailService implements IEmailService {
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
        HttpStatus.INTERNAL_SERVER_ERROR,
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
        text: renderOtpEmailText(code),
        html: renderOtpEmailHtml(code),
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
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Failed to deliver verification email. Please check your email address or SMTP configuration."
      );
    }
  }
}

export { NodemailerEmailService as EmailService };
export default NodemailerEmailService;
