import app from "./app.js";
import { connectDB, disconnectDB } from "./config/database.js";
import logger from "./logger/logger.js";
import { env } from "./config/env.js";

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Server running in [${env.NODE_ENV}] mode on port ${PORT}`);
  });

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info("HTTP server closed. No longer accepting connections.");
      await disconnectDB();
      logger.info("Graceful shutdown completed.");
      process.exit(0);
    });

    // Forceful exit timeout after 10s if requests fail to drain
    setTimeout(() => {
      logger.error("Could not close active connections in time. Forcefully terminating process.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ err: reason }, "Unhandled Promise Rejection detected");
  });

  process.on("uncaughtException", (error: Error) => {
    logger.fatal({ err: error }, "Uncaught Exception detected. Terminating process.");
    process.exit(1);
  });
};

startServer();