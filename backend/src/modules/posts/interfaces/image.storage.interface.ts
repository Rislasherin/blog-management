export interface IImageStorage {
  upload(file: Express.Multer.File): Promise<string>;
  delete(imageUrl: string): Promise<void>;
}
