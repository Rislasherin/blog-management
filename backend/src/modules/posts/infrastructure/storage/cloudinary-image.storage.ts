import { v2 as cloudinary } from "cloudinary";
import type { IImageStorage } from "../../domain/services/image.storage.interface.js";
import { env } from "../../../../config/env.js";
import { AppError } from "../../../../shared/errors/AppError.js";
import logger from "../../../../infrastructure/logger/logger.js";

export class CloudinaryImageStorage implements IImageStorage {
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

  async upload(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "blog-posts",
          transformation: [
            { width: 1200, height: 630, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" }
          ]
        },
        (error: any, result: any) => {
          if (error || !result) {
            logger.error({ error }, "Cloudinary image upload failed");
            return reject(new AppError(500, "Image upload failed"));
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
    } catch (error) {
      logger.error({ imageUrl, error }, "Cloudinary image deletion failed");
    }
  }
}
