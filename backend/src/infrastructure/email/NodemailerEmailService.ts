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
      // RFC standard SMTP ports: 465 requires direct SSL/TLS; 587/25/2525 requires STARTTLS
      let isSecure = env.SMTP_SECURE;
      if (env.SMTP_PORT === 465) {
        if (isSecure === false) {
          logger.warn(
            "SMTP_PORT is set to 465 (SMTPS) but SMTP_SECURE was set to false. Overriding to true as port 465 requires direct TLS/SSL."
          );
        }
        isSecure = true;
      } else if (env.SMTP_PORT === 587 || env.SMTP_PORT === 25 || env.SMTP_PORT === 2525) {
        if (isSecure === true) {
          logger.warn(
            `SMTP_PORT is set to ${env.SMTP_PORT} but SMTP_SECURE was set to true. Overriding to false as port ${env.SMTP_PORT} uses STARTTLS.`
          );
        }
        isSecure = false;
      } else if (isSecure === undefined) {
        isSecure = false;
      }

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
      const smtpErr = err as {
        code?: string;
        command?: string;
        responseCode?: number;
        message?: string;
      };
      const errorCode = typeof smtpErr?.code === "string" ? smtpErr.code : undefined;
      const command = typeof smtpErr?.command === "string" ? smtpErr.command : undefined;
      const responseCode = typeof smtpErr?.responseCode === "number" ? smtpErr.responseCode : undefined;
      const errorMessage = err instanceof Error ? err.message : String(err);

      logger.warn({
        msg: "SMTP connection verification failed",
        errorCode,
        command,
        responseCode,
        errorMessage,
      });

      return {
        success: false,
        message: `SMTP connection verification failed: ${errorMessage}${errorCode ? ` [Code: ${errorCode}]` : ""}`,
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
      const devHint = env.NODE_ENV === "development"
        ? " (SMTP is not configured in backend/.env)"
        : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Email delivery is not configured on the server. Please check your SMTP settings in backend/.env.${devHint}`
      );
    }

    try {
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
        to: email,
        subject: "Your BlogPlatform Verification Code",
        text: renderOtpEmailText(code),
        html: renderOtpEmailHtml(code),
      };

      const info = await this.transporter.sendMail(mailOptions);
      if (info && Array.isArray(info.rejected) && info.rejected.length > 0) {
        throw new Error(`Recipient address was rejected by SMTP server: ${info.rejected.join(", ")}`);
      }
      if (info && Array.isArray(info.accepted) && info.accepted.length === 0) {
        throw new Error(`SMTP server did not accept delivery for recipient: ${email}`);
      }

      logger.info({
        msg: "OTP verification email dispatched successfully",
        recipient: email,
      });
    } catch (err: unknown) {
      const smtpErr = err as {
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
      const hostname = typeof smtpErr?.hostname === "string" ? smtpErr.hostname : env.SMTP_HOST;
      const port = typeof smtpErr?.port === "number" ? smtpErr.port : env.SMTP_PORT;
      const rawMessage = err instanceof Error ? err.message : String(err);

      // Safe diagnostic logging: logs error code, command, responseCode, syscall, host/port.
      // NEVER logs passwords, credentials, OTPs, or auth tokens.
      logger.error({
        msg: "Failed to dispatch verification email via SMTP",
        recipient: email,
        errorCode,
        command,
        responseCode,
        smtpResponse,
        syscall,
        hostname,
        port,
        errorMessage: rawMessage,
      });

      // Distinguish client-side invalid recipient from server/infrastructure SMTP errors
      const isRecipientRejected =
        responseCode === 550 ||
        responseCode === 553 ||
        errorCode === "EENVELOPE" ||
        rawMessage.includes("rejected by SMTP server") ||
        rawMessage.includes("did not accept delivery") ||
        rawMessage.includes("recipient rejected") ||
        rawMessage.includes("User unknown");

      const isDevOrTest = env.NODE_ENV !== "production";

      if (isRecipientRejected) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          "The verification email could not be delivered to this email address. Please check that your email address is correct."
        );
      }

      // Check for SMTP Authentication error (EAUTH or responseCode 535)
      const isAuthError =
        errorCode === "EAUTH" ||
        responseCode === 535 ||
        rawMessage.includes("Username and Password not accepted") ||
        rawMessage.includes("BadCredentials") ||
        rawMessage.includes("Application-specific password required");

      if (isAuthError) {
        const devHint = isDevOrTest
          ? " (SMTP authentication failed: verify SMTP_USER and App Password in backend/.env)"
          : "";
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. Please check your email address or SMTP configuration.${devHint}`
        );
      }

      // Check for Connection / Timeout / TLS mismatch (ETIMEDOUT, ECONNREFUSED, ESOCKET, ENOTFOUND)
      const isConnectionError =
        errorCode === "ETIMEDOUT" ||
        errorCode === "ECONNREFUSED" ||
        errorCode === "ESOCKET" ||
        errorCode === "ENOTFOUND" ||
        rawMessage.includes("Greeting never received") ||
        rawMessage.includes("wrong version number");

      if (isConnectionError) {
        const devHint = isDevOrTest
          ? ` (SMTP connection failed: ${errorCode || "TIMEOUT"} on ${hostname || "SMTP"}:${port || "PORT"}. Verify SMTP_HOST, SMTP_PORT, and SMTP_SECURE)`
          : "";
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. Please check your email address or SMTP configuration.${devHint}`
        );
      }

      // General fallback preserving the standard message while including dev diagnostic in non-production
      const devHint = isDevOrTest && rawMessage ? ` (${rawMessage})` : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Failed to deliver verification email. Please check your email address or SMTP configuration.${devHint}`
      );
    }
  }
}

export { NodemailerEmailService as EmailService };
export default NodemailerEmailService;
