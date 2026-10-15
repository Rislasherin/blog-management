import pino from "pino";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

const logger = isProduction
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

export default logger;