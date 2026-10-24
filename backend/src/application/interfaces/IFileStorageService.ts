export interface UploadableFile {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
}

export interface IFileStorageService {
  upload(file: UploadableFile): Promise<string>;
  delete(fileUrl: string): Promise<void>;
}

export type IImageStorage = IFileStorageService;
export type IImageStorageService = IFileStorageService;

export default IFileStorageService;
