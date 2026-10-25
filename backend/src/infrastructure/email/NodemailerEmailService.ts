import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import logger from "../logging/PinoLogger.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import type { IEmailService } from "../../application/interfaces/IEmailService.js";
import { renderOtpEmailHtml, renderOtpEmailText } from "./templates/otp-email.template.js";

export class NodemailerEmailService implements IEmailService {
  private transporter: Transporter | null = null;
  public readonly effectiveConfig: { host: string; port: number; secure: boolean };

  constructor(customTransporter?: Transporter | null) {
    const effectivePort = env.SMTP_PORT || 587;
    // Default to false for port 587 (STARTTLS), true for port 465 (SMTPS), or use explicitly configured boolean
    const isSecure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : effectivePort === 465;

    this.effectiveConfig = {
      host: env.SMTP_HOST || "smtp.gmail.com",
      port: effectivePort,
      secure: isSecure,
    };

    if (customTransporter !== undefined) {
      this.transporter = customTransporter;
    } else if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = this.createTransporter(this.effectiveConfig.port, this.effectiveConfig.secure);

      logger.info({
        msg: "SMTP Transporter initialized",
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        secure: this.effectiveConfig.secure,
        hasUser: Boolean(env.SMTP_USER),
        hasPass: Boolean(env.SMTP_PASS),
      });
    }
  }

  getEffectiveConfig(): { host: string; port: number; secure: boolean } {
    return { ...this.effectiveConfig };
  }

  private createTransporter(port: number, secure: boolean): Transporter {
    const cleanPass = env.SMTP_PASS?.replace(/\s+/g, "") || "";
    return nodemailer.createTransport({
      host: env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: env.SMTP_USER,
        pass: cleanPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  async verifyConnection(): Promise<{
    success: boolean;
    message: string;
    details?: {
      host: string;
      port: number;
      secure: boolean;
      latencyMs?: number;
      code?: string;
    };
  }> {
    if (!this.transporter) {
      logger.warn({
        msg: "SMTP connection verification aborted: Transporter not configured",
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        secure: this.effectiveConfig.secure,
        hasUser: Boolean(env.SMTP_USER),
        hasPass: Boolean(env.SMTP_PASS),
      });
      return {
        success: false,
        message:
          "SMTP transporter is not initialized. Please verify SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables.",
      };
    }

    const startTime = Date.now();
    try {
      await this.transporter.verify();
      const latencyMs = Date.now() - startTime;

      logger.info({
        msg: "SMTP connection verified successfully",
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        secure: this.effectiveConfig.secure,
        latencyMs,
      });

      return {
        success: true,
        message: `SMTP server connection and credentials verified successfully on ${this.effectiveConfig.host}:${this.effectiveConfig.port} (${this.effectiveConfig.secure ? "SSL/TLS" : "STARTTLS"}) in ${latencyMs}ms.`,
        details: {
          host: this.effectiveConfig.host,
          port: this.effectiveConfig.port,
          secure: this.effectiveConfig.secure,
          latencyMs,
        },
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const smtpErr = err as {
        code?: string;
        command?: string;
        responseCode?: number;
        syscall?: string;
        message?: string;
      };

      const errorCode = typeof smtpErr?.code === "string" ? smtpErr.code : undefined;
      const command = typeof smtpErr?.command === "string" ? smtpErr.command : undefined;
      const responseCode = typeof smtpErr?.responseCode === "number" ? smtpErr.responseCode : undefined;
      const syscall = typeof smtpErr?.syscall === "string" ? smtpErr.syscall : undefined;
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Safe logging: no credentials, tokens, or passwords
      logger.error({
        msg: "SMTP connection verification failed",
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        secure: this.effectiveConfig.secure,
        errorCode,
        command,
        responseCode,
        syscall,
        latencyMs,
        errorMessage,
      });

      return {
        success: false,
        message: `SMTP connection verification failed on port ${this.effectiveConfig.port}: ${errorMessage}${errorCode ? ` [Code: ${errorCode}]` : ""}`,
        details: {
          host: this.effectiveConfig.host,
          port: this.effectiveConfig.port,
          secure: this.effectiveConfig.secure,
          latencyMs,
          ...(errorCode ? { code: errorCode } : {}),
        },
      };
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      logger.error({
        msg: "Cannot send OTP email: SMTP is not configured in environment variables",
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        hasUser: Boolean(env.SMTP_USER),
        hasPass: Boolean(env.SMTP_PASS),
      });
      const devHint = env.NODE_ENV === "development"
        ? " (SMTP is not configured in backend/.env)"
        : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Email delivery is not configured on the server. Please check your SMTP settings in backend/.env.${devHint}`
      );
    }

    const recipient = email.toLowerCase().trim();

    let fromAddress: string;
    if (env.EMAIL_FROM && env.EMAIL_FROM.includes("@")) {
      fromAddress = env.EMAIL_FROM.includes("<")
        ? env.EMAIL_FROM
        : `BlogPlatform <${env.EMAIL_FROM}>`;
    } else if (env.SMTP_USER) {
      fromAddress = `BlogPlatform <${env.SMTP_USER}>`;
    } else {
      fromAddress = "BlogPlatform <noreply@blogmanagement.com>";
    }

    const mailOptions = {
      from: fromAddress,
      to: recipient,
      subject: "Your BlogPlatform Verification Code",
      text: renderOtpEmailText(code),
      html: renderOtpEmailHtml(code),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      if (info && Array.isArray(info.rejected) && info.rejected.length > 0) {
        throw new Error(`Recipient address was rejected by SMTP server: ${info.rejected.join(", ")}`);
      }
      if (info && Array.isArray(info.accepted) && info.accepted.length === 0) {
        throw new Error(`SMTP server did not accept delivery for recipient: ${recipient}`);
      }

      logger.info({
        msg: "OTP verification email dispatched successfully via Gmail SMTP",
        recipient,
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        messageId: info?.messageId,
      });
    } catch (primaryErr: unknown) {
      if (primaryErr instanceof AppError) {
        throw primaryErr;
      }

      const smtpErr = primaryErr as {
        code?: string;
        command?: string;
        responseCode?: number;
        response?: string;
        syscall?: string;
        hostname?: string;
        port?: number;
        message?: string;
      };

      const errorCode = typeof smtpErr?.code === "string" ? smtpErr.code : undefined;
      const command = typeof smtpErr?.command === "string" ? smtpErr.command : undefined;
      const responseCode = typeof smtpErr?.responseCode === "number" ? smtpErr.responseCode : undefined;
      const smtpResponse = typeof smtpErr?.response === "string" ? smtpErr.response : undefined;
      const syscall = typeof smtpErr?.syscall === "string" ? smtpErr.syscall : undefined;
      const hostname = typeof smtpErr?.hostname === "string" ? smtpErr.hostname : this.effectiveConfig.host;
      const port = typeof smtpErr?.port === "number" ? smtpErr.port : this.effectiveConfig.port;
      const errorMessage = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);

      // Safe diagnostic logging: error code, command, responseCode, syscall, host/port
      // NEVER logs passwords, credentials, OTP codes, or authentication tokens.
      logger.error({
        msg: "SMTP email dispatch failed",
        recipient,
        host: hostname,
        port,
        secure: this.effectiveConfig.secure,
        errorCode,
        command,
        responseCode,
        smtpResponse,
        syscall,
        errorMessage,
      });

      // 1. Recipient rejected by SMTP server (400 Bad Request)
      const isRecipientRejected =
        responseCode === 550 ||
        responseCode === 553 ||
        errorCode === "EENVELOPE" ||
        errorMessage.includes("rejected by SMTP server") ||
        errorMessage.includes("did not accept delivery") ||
        errorMessage.includes("recipient rejected") ||
        errorMessage.includes("User unknown");

      if (isRecipientRejected) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          "The verification email could not be delivered to this email address. Please check that your email address is correct."
        );
      }

      // 2. Authentication failure (500 Internal Server Error)
      const isAuthError =
        errorCode === "EAUTH" ||
        responseCode === 535 ||
        errorMessage.includes("Username and Password not accepted") ||
        errorMessage.includes("BadCredentials") ||
        errorMessage.includes("Application-specific password required");

      if (isAuthError) {
        const devHint = env.NODE_ENV !== "production"
          ? " (SMTP authentication failed: verify SMTP_USER and Gmail App Password in backend/.env)"
          : "";
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. Please check your SMTP authentication configuration.${devHint}`
        );
      }

      // 3. Connection / Network failure (e.g. Render Free blocking SMTP ports) (500 Internal Server Error)
      const isConnectionError =
        errorCode === "ETIMEDOUT" ||
        errorCode === "ECONNREFUSED" ||
        errorCode === "ESOCKET" ||
        errorCode === "ENOTFOUND" ||
        errorCode === "ECONNRESET" ||
        errorMessage.includes("Greeting never received") ||
        errorMessage.includes("wrong version number") ||
        errorMessage.includes("Connection timed out");

      if (isConnectionError) {
        const devHint = env.NODE_ENV !== "production"
          ? ` (SMTP connection failed: ${errorCode || "TIMEOUT"} on ${hostname}:${port}. Outbound SMTP may be blocked by your hosting provider or network.)`
          : "";
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. SMTP server connection failed.${devHint}`
        );
      }

      // 4. General SMTP failure
      const devHint = env.NODE_ENV !== "production" && errorMessage ? ` (${errorMessage})` : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Failed to deliver verification email. Please check your email configuration.${devHint}`
      );
    }
  }
}

export { NodemailerEmailService as EmailService };
export default NodemailerEmailService;
