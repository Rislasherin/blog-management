import mongoose from "mongoose";
import { env } from "../../config/env.js";
import logger from "../../logging/PinoLogger.js";

const MONGO_URI = env.MONGODB_URI;

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to MongoDB");
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed cleanly");
  } catch (error) {
    logger.error({ err: error }, "Error disconnecting MongoDB");
  }
};

export default connectDB;
