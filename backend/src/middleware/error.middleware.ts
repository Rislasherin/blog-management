import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import logger from "../infrastructure/logger/logger.js";
import mongoose from "mongoose";
import multer from "multer";

const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err, err.message);
    } else {
      logger.warn({ message: err.message, statusCode: err.statusCode }, "Operational error");
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID",
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  logger.error(err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

export default errorMiddleware;
