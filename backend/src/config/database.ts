import mongoose from "mongoose";
import logger from "../infrastructure/logger/logger.js";
import { env } from "./env.js";

let isEventListenersAttached = false;

const attachEventListeners = () => {
  if (isEventListenersAttached) return;

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established successfully");
  });

  mongoose.connection.on("error", (err: unknown) => {
    logger.error({ err }, "MongoDB encountered a connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection disconnected");
  });

  isEventListenersAttached = true;
};

export const connectDB = async (): Promise<void> => {
  attachEventListeners();

  try {
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    logger.error({ err: error }, "Initial MongoDB connection failed");
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed cleanly");
  } catch (error) {
    logger.error({ err: error }, "Error while closing MongoDB connection");
  }
};

export default connectDB;