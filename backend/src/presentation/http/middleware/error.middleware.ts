import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../../domain/errors/AppError.js";
import { HttpStatus } from "../../../domain/enums/HttpStatus.enum.js";
import logger from "../../../infrastructure/logging/PinoLogger.js";
import mongoose from "mongoose";
import multer from "multer";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof AppError) {
    if (err.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
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
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid resource ID",
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }

  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status: unknown }).status === 400
  ) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid JSON payload",
    });
  }

  if ("code" in err && (err as { code: unknown }).code === 11000) {
    return res.status(HttpStatus.CONFLICT).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large",
      });
    }
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }

  logger.error(err);

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal Server Error",
  });
};

export default errorMiddleware;
