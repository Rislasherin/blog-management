import { v2 as cloudinary } from "cloudinary";
import type { IImageStorage } from "../interfaces/image.storage.interface.js";
import AppError from "../../../utils/appError.js";
import logger from "../../../infrastructure/logger/logger.js";

export class CloudinaryImageStorage implements IImageStorage {
  constructor() {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
      throw new AppError(500, "Cloudinary configuration is missing");
    }

    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "blog_posts" },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, "Cloudinary image upload failed");
            return reject(new AppError(500, "Image upload failed"));
          }
          if (!result) {
            return reject(new AppError(500, "Image upload failed: No result"));
          }
          resolve(result.secure_url);
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(imageUrl: string): Promise<void> {
    try {
      const urlParts = imageUrl.split("/");
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const folderName = urlParts[urlParts.length - 2];
      
      if (!filenameWithExtension || !folderName) return;

      const filename = filenameWithExtension.split(".")[0];
      if (!filename) return;

      const publicId = `${folderName}/${filename}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new AppError(500, "Failed to delete image from storage");
    }
  }
}
