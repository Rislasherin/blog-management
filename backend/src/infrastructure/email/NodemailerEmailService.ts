import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import logger from "../logging/PinoLogger.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import type { IEmailService } from "../../application/interfaces/IEmailService.js";
import { renderOtpEmailHtml, renderOtpEmailText } from "./templates/otp-email.template.js";

export class NodemailerEmailService implements IEmailService {
  private transporter: Transporter | null = null;
  private readonly isCustomTransporter: boolean = false;

  constructor(customTransporter?: Transporter | null) {
    if (customTransporter !== undefined) {
      this.transporter = customTransporter;
      this.isCustomTransporter = true;
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

      this.transporter = this.createTransporterForPort(env.SMTP_PORT, isSecure);
    }
  }

  private createTransporterForPort(port: number, secure: boolean): Transporter {
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

  async verifyConnection(portOverride?: number, secureOverride?: boolean): Promise<{
    success: boolean;
    message: string;
    details?: {
      host: string;
      port: number;
      secure: boolean;
      latencyMs?: number | undefined;
      code?: string | undefined;
    };
  }> {
    const port = portOverride ?? env.SMTP_PORT;
    const isSecure = secureOverride ?? (port === 465 ? true : port === 587 ? false : (env.SMTP_SECURE ?? false));
    const transporter = (portOverride !== undefined || !this.transporter)
      ? this.createTransporterForPort(port, isSecure)
      : this.transporter;

    if (!transporter) {
      return {
        success: false,
        message:
          "SMTP transporter is not initialized. Please verify SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.",
      };
    }

    const startTime = Date.now();
    try {
      await transporter.verify();
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: `SMTP server connection and credentials verified successfully on port ${port} (${isSecure ? "SSL/TLS" : "STARTTLS"}) in ${latencyMs}ms.`,
        details: {
          host: env.SMTP_HOST || "smtp.gmail.com",
          port,
          secure: isSecure,
          latencyMs,
        },
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
      const latencyMs = Date.now() - startTime;

      logger.warn({
        msg: "SMTP connection verification failed",
        port,
        isSecure,
        errorCode,
        command,
        responseCode,
        latencyMs,
        errorMessage,
      });

      return {
        success: false,
        message: `SMTP connection verification failed on port ${port}: ${errorMessage}${errorCode ? ` [Code: ${errorCode}]` : ""}`,
        details: {
          host: env.SMTP_HOST || "smtp.gmail.com",
          port,
          secure: isSecure,
          latencyMs,
          code: errorCode,
        },
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

    try {
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

      // Single controlled fallback if connection timed out (ETIMEDOUT / ECONNREFUSED) on dual-port Gmail SMTP
      const isConnectionError =
        errorCode === "ETIMEDOUT" ||
        errorCode === "ECONNREFUSED" ||
        errorCode === "ESOCKET" ||
        errorCode === "ENOTFOUND" ||
        rawMessage.includes("Greeting never received") ||
        rawMessage.includes("wrong version number");

      if (isConnectionError && !this.isCustomTransporter && (env.SMTP_HOST === "smtp.gmail.com" || !env.SMTP_HOST)) {
        const altPort = env.SMTP_PORT === 465 ? 587 : 465;
        const altSecure = altPort === 465;

        logger.warn({
          msg: `SMTP port ${env.SMTP_PORT} connection timed out. Attempting single fallback on alternate port ${altPort} (${altSecure ? "SSL/TLS" : "STARTTLS"})...`,
          recipient: email,
          originalErrorCode: errorCode,
        });

        try {
          const fallbackTransporter = this.createTransporterForPort(altPort, altSecure);
          const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
          if (fallbackInfo && (!Array.isArray(fallbackInfo.rejected) || fallbackInfo.rejected.length === 0)) {
            logger.info({
              msg: `OTP verification email dispatched successfully via fallback port ${altPort}. Port ${env.SMTP_PORT} appears blocked or throttled by network/firewall. Consider setting SMTP_PORT=${altPort} and SMTP_SECURE=${altSecure} in backend/.env.`,
              recipient: email,
            });
            return;
          }
        } catch (fallbackErr: unknown) {
          logger.warn({
            msg: `Fallback attempt on alternate port ${altPort} also encountered an error`,
            fallbackError: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          });
        }
      }

      if (isConnectionError) {
        const altPort = (port === 465 ? 587 : 465);
        const altSecure = altPort === 465;
        const devHint = isDevOrTest
          ? ` (SMTP connection failed: ${errorCode || "TIMEOUT"} on ${hostname || "SMTP"}:${port || "PORT"}. Your network, ISP, or firewall may be blocking outbound port ${port}. Try switching SMTP_PORT=${altPort} and SMTP_SECURE=${altSecure} in backend/.env)`
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
