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
  public readonly effectiveConfig: { host: string; port: number; secure: boolean };

  constructor(customTransporter?: Transporter | null) {
    let effectivePort = env.SMTP_PORT;
    let isSecure = env.SMTP_SECURE;

    // RFC standard SMTP ports: 465 requires direct SSL/TLS; 587/25/2525 requires STARTTLS
    if (effectivePort === 465) {
      if (isSecure === false) {
        logger.warn(
          "SMTP_PORT is set to 465 (SMTPS) but SMTP_SECURE was set to false. Overriding to true as port 465 requires direct TLS/SSL."
        );
      }
      isSecure = true;
    } else if (effectivePort === 587 || effectivePort === 25 || effectivePort === 2525) {
      if (isSecure === true) {
        logger.warn(
          `SMTP_PORT is set to ${effectivePort} but SMTP_SECURE was set to true. Overriding to false as port ${effectivePort} uses STARTTLS.`
        );
      }
      isSecure = false;
    } else if (isSecure === undefined) {
      isSecure = false;
    }

    this.effectiveConfig = {
      host: env.SMTP_HOST || "smtp.gmail.com",
      port: effectivePort,
      secure: isSecure,
    };

    if (customTransporter !== undefined) {
      this.transporter = customTransporter;
      this.isCustomTransporter = true;
    } else if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = this.createTransporterForPort(effectivePort, isSecure);

      logger.info({
        msg: "SMTP Transporter initialized",
        host: this.effectiveConfig.host,
        port: this.effectiveConfig.port,
        secure: this.effectiveConfig.secure,
      });
    }
  }

  getEffectiveConfig(): { host: string; port: number; secure: boolean } {
    return { ...this.effectiveConfig };
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
    const port = portOverride ?? this.effectiveConfig.port;
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
        port: this.effectiveConfig.port,
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

      const primaryErrorCode = typeof smtpErr?.code === "string" ? smtpErr.code : undefined;
      const primaryCommand = typeof smtpErr?.command === "string" ? smtpErr.command : undefined;
      const primaryResponseCode = typeof smtpErr?.responseCode === "number" ? smtpErr.responseCode : undefined;
      const primarySmtpResponse = typeof smtpErr?.response === "string" ? smtpErr.response : undefined;
      const primarySyscall = typeof smtpErr?.syscall === "string" ? smtpErr.syscall : undefined;
      const primaryHostname = typeof smtpErr?.hostname === "string" ? smtpErr.hostname : this.effectiveConfig.host;
      const primaryPort = typeof smtpErr?.port === "number" ? smtpErr.port : this.effectiveConfig.port;
      const primaryErrorMessage = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);

      // Safe diagnostic logging: logs error code, command, responseCode, syscall, host/port separately
      // NEVER logs passwords, credentials, OTPs, or auth tokens.
      logger.error({
        msg: "Primary SMTP dispatch failed",
        recipient: email,
        errorCode: primaryErrorCode,
        command: primaryCommand,
        responseCode: primaryResponseCode,
        smtpResponse: primarySmtpResponse,
        syscall: primarySyscall,
        hostname: primaryHostname,
        port: primaryPort,
        errorMessage: primaryErrorMessage,
      });

      // Distinguish client-side invalid recipient from server/infrastructure SMTP errors
      const isRecipientRejected =
        primaryResponseCode === 550 ||
        primaryResponseCode === 553 ||
        primaryErrorCode === "EENVELOPE" ||
        primaryErrorMessage.includes("rejected by SMTP server") ||
        primaryErrorMessage.includes("did not accept delivery") ||
        primaryErrorMessage.includes("recipient rejected") ||
        primaryErrorMessage.includes("User unknown");

      const isDevOrTest = env.NODE_ENV !== "production";

      if (isRecipientRejected) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          "The verification email could not be delivered to this email address. Please check that your email address is correct."
        );
      }

      // Check for SMTP Authentication error (EAUTH or responseCode 535)
      const isAuthError =
        primaryErrorCode === "EAUTH" ||
        primaryResponseCode === 535 ||
        primaryErrorMessage.includes("Username and Password not accepted") ||
        primaryErrorMessage.includes("BadCredentials") ||
        primaryErrorMessage.includes("Application-specific password required");

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
        primaryErrorCode === "ETIMEDOUT" ||
        primaryErrorCode === "ECONNREFUSED" ||
        primaryErrorCode === "ESOCKET" ||
        primaryErrorCode === "ENOTFOUND" ||
        primaryErrorMessage.includes("Greeting never received") ||
        primaryErrorMessage.includes("wrong version number");

      let fallbackAttempted = false;
      let fallbackDetails: { errorCode?: string | undefined; port?: number | undefined; errorMessage?: string | undefined } | undefined;

      if (isConnectionError && !this.isCustomTransporter && (env.SMTP_HOST === "smtp.gmail.com" || !env.SMTP_HOST)) {
        fallbackAttempted = true;
        const altPort = primaryPort === 465 ? 587 : 465;
        const altSecure = altPort === 465;

        logger.warn({
          msg: `Primary SMTP port ${primaryPort} connection timed out. Attempting single fallback on alternate port ${altPort} (${altSecure ? "SSL/TLS" : "STARTTLS"})...`,
          recipient: email,
          primaryPort,
          fallbackPort: altPort,
          primaryErrorCode,
        });

        try {
          const fallbackTransporter = this.createTransporterForPort(altPort, altSecure);
          const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);

          const isAccepted =
            fallbackInfo &&
            Array.isArray(fallbackInfo.accepted) &&
            fallbackInfo.accepted.includes(email) &&
            (!Array.isArray(fallbackInfo.rejected) || !fallbackInfo.rejected.includes(email));

          if (isAccepted) {
            logger.info({
              msg: `OTP verification email dispatched successfully via fallback port ${altPort}. Port ${primaryPort} appears blocked by network/firewall. Consider setting SMTP_PORT=${altPort} and SMTP_SECURE=${altSecure} in backend/.env.`,
              recipient: email,
              fallbackPort: altPort,
            });
            return;
          }

          if (fallbackInfo && Array.isArray(fallbackInfo.rejected) && fallbackInfo.rejected.includes(email)) {
            logger.error({
              msg: "Fallback SMTP dispatch recipient was rejected",
              recipient: email,
              rejected: fallbackInfo.rejected,
              fallbackPort: altPort,
            });
            throw new AppError(
              HttpStatus.BAD_REQUEST,
              "The verification email could not be delivered to this email address. Please check that your email address is correct."
            );
          }
        } catch (fallbackErr: unknown) {
          if (fallbackErr instanceof AppError) {
            throw fallbackErr;
          }

          const fbSmtpErr = fallbackErr as {
            code?: string;
            command?: string;
            responseCode?: number;
            response?: string;
            syscall?: string;
            hostname?: string;
            port?: number;
            message?: string;
          };

          const fbErrorCode = typeof fbSmtpErr?.code === "string" ? fbSmtpErr.code : undefined;
          const fbCommand = typeof fbSmtpErr?.command === "string" ? fbSmtpErr.command : undefined;
          const fbResponseCode = typeof fbSmtpErr?.responseCode === "number" ? fbSmtpErr.responseCode : undefined;
          const fbSmtpResponse = typeof fbSmtpErr?.response === "string" ? fbSmtpErr.response : undefined;
          const fbSyscall = typeof fbSmtpErr?.syscall === "string" ? fbSmtpErr.syscall : undefined;
          const fbHostname = typeof fbSmtpErr?.hostname === "string" ? fbSmtpErr.hostname : this.effectiveConfig.host;
          const fbErrorMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);

          fallbackDetails = { errorCode: fbErrorCode, port: altPort, errorMessage: fbErrorMessage };

          logger.error({
            msg: "Fallback SMTP dispatch also failed",
            recipient: email,
            errorCode: fbErrorCode,
            command: fbCommand,
            responseCode: fbResponseCode,
            smtpResponse: fbSmtpResponse,
            syscall: fbSyscall,
            hostname: fbHostname,
            port: altPort,
            errorMessage: fbErrorMessage,
          });
        }
      }

      if (isConnectionError) {
        const altPort = primaryPort === 465 ? 587 : 465;
        const altSecure = altPort === 465;
        const fallbackInfoText = fallbackAttempted
          ? ` and fallback port ${altPort} also failed (${fallbackDetails?.errorCode || "FAILED"})`
          : "";
        const devHint = isDevOrTest
          ? ` (SMTP connection failed: ${primaryErrorCode || "TIMEOUT"} on ${primaryHostname}:${primaryPort}${fallbackInfoText}. Your network or firewall may be blocking outbound port ${primaryPort}. Try switching SMTP_PORT=${altPort} and SMTP_SECURE=${altSecure} in backend/.env)`
          : "";
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. Please check your email address or SMTP configuration.${devHint}`
        );
      }

      // General fallback preserving the standard message while including dev diagnostic in non-production
      const devHint = isDevOrTest && primaryErrorMessage ? ` (${primaryErrorMessage})` : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Failed to deliver verification email. Please check your email address or SMTP configuration.${devHint}`
      );
    }
  }
}

export { NodemailerEmailService as EmailService };
export default NodemailerEmailService;
