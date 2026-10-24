import { v2 as cloudinary } from "cloudinary";
import type { IFileStorageService, UploadableFile } from "../../application/interfaces/IFileStorageService.js";
import { env } from "../config/env.js";
import { AppError } from "../../domain/errors/AppError.js";
import { HttpStatus } from "../../domain/enums/HttpStatus.enum.js";
import logger from "../logging/PinoLogger.js";

export class CloudinaryStorageService implements IFileStorageService {
  constructor() {
    const cloud_name = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
    const api_secret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

    if (cloud_name && api_key && api_secret) {
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
      });
    }
  }

  async upload(file: UploadableFile): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "blog-posts",
          transformation: [
            { width: 1200, height: 630, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error: Error | { message?: string } | null | undefined, result: { secure_url?: string } | undefined) => {
          if (error || !result || !result.secure_url) {
            logger.error({ error }, "Cloudinary image upload failed");
            return reject(new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Image upload failed"));
          }
          resolve(result.secure_url);
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(imageUrl: string): Promise<void> {
    try {
      const parts = imageUrl.split("/");
      const lastPart = parts[parts.length - 1];
      if (!lastPart) return;

      const fileName = lastPart.split(".")[0];
      const publicId = `blog-posts/${fileName}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
      logger.error({ imageUrl, error }, "Cloudinary image deletion failed");
    }
  }
}

export { CloudinaryStorageService as CloudinaryImageStorage };
export default CloudinaryStorageService;
