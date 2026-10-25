import { Resend } from "resend";
import { env } from "../config/env.js";
import logger from "../logging/PinoLogger.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import type { IEmailService } from "../../application/interfaces/IEmailService.js";
import { renderOtpEmailHtml, renderOtpEmailText } from "./templates/otp-email.template.js";

export class ResendEmailService implements IEmailService {
  private resend: Resend | null = null;
  public readonly senderAddress: string;

  constructor(customClient?: Resend | null) {
    if (customClient !== undefined) {
      this.resend = customClient;
    } else if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
      logger.info({
        msg: "Resend EmailService initialized with HTTPS API transport",
      });
    }

    this.senderAddress = this.resolveSenderAddress();
  }

  private resolveSenderAddress(): string {
    const rawFrom = env.EMAIL_FROM?.trim();

    if (!rawFrom) {
      return "BlogPlatform <onboarding@resend.dev>";
    }

    // Resend strictly forbids sending from public webmail domains (SPF/DMARC rejection)
    const publicDomains = ["@gmail.com", "@yahoo.com", "@hotmail.com", "@outlook.com", "@icloud.com"];
    const isPublicWebmail = publicDomains.some((d) => rawFrom.toLowerCase().includes(d));

    if (isPublicWebmail) {
      logger.warn({
        msg: "EMAIL_FROM is using a public webmail domain (e.g. @gmail.com) which is rejected by Resend. Falling back to 'BlogPlatform <onboarding@resend.dev>'. In production, verify a custom domain at resend.com/domains and set EMAIL_FROM=noreply@yourdomain.com.",
      });
      return "BlogPlatform <onboarding@resend.dev>";
    }

    if (rawFrom.includes("<")) {
      return rawFrom;
    }

    return `BlogPlatform <${rawFrom}>`;
  }

  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.resend) {
      return {
        success: false,
        message: "RESEND_API_KEY is not configured in backend environment variables.",
      };
    }

    try {
      const response = await this.resend.domains.list();
      if (response.error) {
        return {
          success: false,
          message: `Resend API authentication failed: ${response.error.message}`,
        };
      }

      return {
        success: true,
        message: "Resend API key verified successfully. Ready to dispatch emails via HTTPS.",
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Resend API connection failed: ${errorMessage}`,
      };
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (!this.resend) {
      logger.error({
        msg: "Cannot send OTP email: RESEND_API_KEY is not configured",
        hasKey: Boolean(env.RESEND_API_KEY),
      });
      const devHint = env.NODE_ENV === "development"
        ? " (RESEND_API_KEY is missing from environment variables)"
        : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Email delivery is not configured on the server. Please check your Resend settings in backend/.env.${devHint}`
      );
    }

    const recipient = email.toLowerCase().trim();

    try {
      const response = await this.resend.emails.send({
        from: this.senderAddress,
        to: recipient,
        subject: "Your BlogPlatform Verification Code",
        text: renderOtpEmailText(code),
        html: renderOtpEmailHtml(code),
      });

      if (response.error) {
        const errorName = response.error.name;
        const errorMessage = response.error.message;
        const errorStatus = (response.error as { statusCode?: number }).statusCode;

        logger.error({
          msg: "Resend email delivery rejected by API",
          recipient,
          errorName,
          statusCode: errorStatus,
          errorMessage,
        });

        // 1. Unverified test sandbox account sending to a third-party email
        if (
          errorMessage.includes("only send testing emails to your own email address") ||
          errorMessage.includes("verify a domain")
        ) {
          throw new AppError(
            HttpStatus.FORBIDDEN,
            `Failed to deliver verification email: Resend test sandbox only permits delivery to the account owner. To send to any recipient, verify your custom domain in Resend and update EMAIL_FROM.`
          );
        }

        // 2. Client-facing validation error (invalid recipient address or format)
        if (errorStatus === 422 || errorName === "validation_error") {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            `The verification email could not be delivered to this email address: ${errorMessage}`
          );
        }

        // 3. Rate limiting
        if (errorStatus === 429) {
          throw new AppError(
            HttpStatus.TOO_MANY_REQUESTS,
            "Email sending rate limit exceeded. Please try again shortly."
          );
        }

        // 4. Authentication error with Resend API
        if (errorStatus === 401 || errorStatus === 403) {
          throw new AppError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            `Email service authentication error: ${errorMessage}`
          );
        }

        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. Please check your email configuration: ${errorMessage}`
        );
      }

      if (!response.data || !response.data.id) {
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to deliver verification email: Resend did not return a message ID."
        );
      }

      logger.info({
        msg: "OTP verification email dispatched successfully via Resend",
        recipient,
        messageId: response.data.id,
      });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const rawMessage = err instanceof Error ? err.message : String(err);
      logger.error({
        msg: "Unexpected error during Resend email dispatch",
        recipient,
        error: rawMessage,
      });

      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Failed to deliver verification email: ${rawMessage}`
      );
    }
  }
}

export { ResendEmailService as EmailService };
export default ResendEmailService;
