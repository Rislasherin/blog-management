import { env } from "../config/env.js";
import logger from "../logging/PinoLogger.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import type { IEmailService } from "../../application/interfaces/IEmailService.js";
import { renderOtpEmailHtml, renderOtpEmailText } from "./templates/otp-email.template.js";

export interface Email59SendResponse {
  id?: string;
  status?: string;
  detail?: string | { error?: string; verdict?: string; message?: string };
  error?: string;
  message?: string;
  verdict?: string;
}

export interface Email59AccountResponse {
  daily_limit?: number;
  sent_today?: number;
  remaining_today?: number;
  credits_remaining?: number;
  detail?: string | { error?: string; message?: string };
  error?: string;
}

export class Email59EmailService implements IEmailService {
  private readonly apiKey: string;
  public readonly senderName: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(
    apiKey?: string,
    customFetch?: typeof fetch,
    baseUrl = "https://email59.com/v1"
  ) {
    this.apiKey = apiKey ?? (env.EMAIL59_KEY || "");
    this.fetchFn = customFetch ?? globalThis.fetch;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.senderName = this.resolveSenderName();
  }

  private resolveSenderName(): string {
    const raw = env.EMAIL59_FROM || env.EMAIL_FROM || "blogplatform";
    let name: string = raw.includes("@") ? (raw.split("@")[0] ?? raw) : raw;
    if (name.includes("<")) {
      const match = name.match(/<([^>]+)>/);
      name = match?.[1] ?? name.split("<")[1] ?? name;
      if (name.includes("@")) {
        name = name.split("@")[0] ?? name;
      }
    }
    name = name.replace(/[^a-zA-Z0-9._+-]/g, "").toLowerCase().trim();
    return name || "blogplatform";
  }

  getEffectiveSender(): string {
    return `${this.senderName}@email59.com`;
  }

  async verifyConnection(): Promise<{
    success: boolean;
    message: string;
    details?: {
      sender: string;
      dailyLimit?: number;
      sentToday?: number;
      remainingToday?: number;
      creditsRemaining?: number;
    };
  }> {
    if (!this.apiKey) {
      logger.warn({
        msg: "email59 connection verification aborted: EMAIL59_KEY is not configured",
      });
      return {
        success: false,
        message: "EMAIL59_KEY is not configured in environment variables.",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await this.fetchFn(`${this.baseUrl}/account`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": "BlogPlatform-Backend/1.0",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const data = (await response.json().catch(() => null)) as Email59AccountResponse | null;

      if (!response.ok) {
        const errorDetail =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.error || data?.detail?.message || data?.error || `HTTP ${response.status}`;

        logger.error({
          msg: "email59 account verification failed",
          statusCode: response.status,
          errorDetail,
        });

        return {
          success: false,
          message: `email59 account verification failed (${response.status}): ${errorDetail}`,
        };
      }

      logger.info({
        msg: "email59 account verified successfully",
        sender: this.getEffectiveSender(),
        dailyLimit: data?.daily_limit,
        remainingToday: data?.remaining_today,
        credits: data?.credits_remaining,
      });

      return {
        success: true,
        message: `email59 API connection and credentials verified successfully. Remaining emails today: ${data?.remaining_today ?? "unspecified"}/${data?.daily_limit ?? "unspecified"}, credits: ${data?.credits_remaining ?? 0}. Sender: ${this.getEffectiveSender()}.`,
        details: {
          sender: this.getEffectiveSender(),
          ...(data?.daily_limit !== undefined ? { dailyLimit: data.daily_limit } : {}),
          ...(data?.sent_today !== undefined ? { sentToday: data.sent_today } : {}),
          ...(data?.remaining_today !== undefined ? { remainingToday: data.remaining_today } : {}),
          ...(data?.credits_remaining !== undefined ? { creditsRemaining: data.credits_remaining } : {}),
        },
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({
        msg: "email59 connection verification error",
        error: errorMessage,
      });

      return {
        success: false,
        message: `email59 connection check failed: ${errorMessage}`,
      };
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (!this.apiKey) {
      logger.error({
        msg: "Cannot send OTP email: EMAIL59_KEY is not configured",
      });
      const devHint =
        env.NODE_ENV === "development"
          ? " (EMAIL59_KEY is missing from environment variables)"
          : "";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Email delivery is not configured on the server. Please check your EMAIL59_KEY settings.${devHint}`
      );
    }

    const recipient = email.toLowerCase().trim();

    const payload = {
      from: this.senderName,
      to: recipient,
      subject: "Your BlogPlatform Verification Code",
      text: renderOtpEmailText(code),
      html: renderOtpEmailHtml(code),
      category: "transactional",
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await this.fetchFn(`${this.baseUrl}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "BlogPlatform-Backend/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const data = (await response.json().catch(() => null)) as Email59SendResponse | null;

      if (!response.ok) {
        const errorDetail =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.error ||
              data?.detail?.message ||
              data?.error ||
              data?.message ||
              `HTTP ${response.status}`;
        const verdict =
          (typeof data?.detail === "object" ? data?.detail?.verdict : undefined) ||
          data?.verdict;

        logger.error({
          msg: "email59 dispatch failed",
          recipient,
          statusCode: response.status,
          errorDetail,
          verdict,
        });

        // 1. Client-facing invalid recipient rejection (422 / 400 / recipient_rejected)
        if (
          response.status === 422 ||
          response.status === 400 ||
          errorDetail.includes("recipient_rejected") ||
          errorDetail.includes("invalid_email")
        ) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            "The verification email could not be delivered to this email address. Please check that your email address is correct."
          );
        }

        // 2. Allowance / Rate limit (429)
        if (
          response.status === 429 ||
          errorDetail.includes("daily_limit_reached") ||
          errorDetail.includes("free_emails_paused") ||
          errorDetail.includes("test_limit_reached")
        ) {
          throw new AppError(
            HttpStatus.TOO_MANY_REQUESTS,
            "Email sending allowance reached for today. Please try again later or contact support."
          );
        }

        // 3. Authentication error (401 / 403)
        if (response.status === 401 || response.status === 403) {
          throw new AppError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            `Email service authentication error: ${errorDetail}`
          );
        }

        // 4. Server/Provider error (500 / 502 / 503)
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Failed to deliver verification email. (${errorDetail})`
        );
      }

      logger.info({
        msg: "OTP verification email dispatched successfully via email59",
        recipient,
        sender: this.getEffectiveSender(),
        messageId: data?.id,
        status: data?.status,
      });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const isAbort =
        (err as Error)?.name === "AbortError" || (err as Error)?.name === "TimeoutError";
      if (isAbort) {
        logger.error({
          msg: "email59 request timed out",
          recipient,
        });
        throw new AppError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Email service request timed out. Please try again shortly."
        );
      }

      const rawMessage = err instanceof Error ? err.message : String(err);
      logger.error({
        msg: "email59 request network failure",
        recipient,
        error: rawMessage,
      });
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Email service connection failed: ${rawMessage}`
      );
    }
  }
}

export { Email59EmailService as EmailService };
export default Email59EmailService;
