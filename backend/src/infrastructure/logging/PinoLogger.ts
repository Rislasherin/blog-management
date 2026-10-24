import pino from "pino";
import type { ILogger } from "../../application/interfaces/ILogger.js";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

const pinoInstance = isProduction
  ? pino({ level: "info" })
  : pino({
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    });

export class PinoLogger implements ILogger {
  info(arg1: string | object, arg2?: string, ...rest: unknown[]): void {
    if (typeof arg1 === "string") {
      pinoInstance.info(arg1, ...rest);
    } else {
      pinoInstance.info(arg1, arg2 as string, ...rest);
    }
  }

  warn(arg1: string | object, arg2?: string, ...rest: unknown[]): void {
    if (typeof arg1 === "string") {
      pinoInstance.warn(arg1, ...rest);
    } else {
      pinoInstance.warn(arg1, arg2 as string, ...rest);
    }
  }

  error(arg1: string | object | Error, arg2?: string, ...rest: unknown[]): void {
    if (typeof arg1 === "string") {
      pinoInstance.error(arg1, ...rest);
    } else {
      pinoInstance.error(arg1, arg2 as string, ...rest);
    }
  }

  debug(arg1: string | object, arg2?: string, ...rest: unknown[]): void {
    if (typeof arg1 === "string") {
      pinoInstance.debug(arg1, ...rest);
    } else {
      pinoInstance.debug(arg1, arg2 as string, ...rest);
    }
  }

  fatal(arg1: string | object, arg2?: string, ...rest: unknown[]): void {
    if (typeof arg1 === "string") {
      pinoInstance.fatal(arg1, ...rest);
    } else {
      pinoInstance.fatal(arg1, arg2 as string, ...rest);
    }
  }
}

export const logger: PinoLogger = new PinoLogger();
export default logger;
