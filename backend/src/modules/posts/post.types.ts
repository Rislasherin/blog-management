export interface IPost {
  id: string;
  title: string;
  subtitle?: string | null;
  content: string;
  imageUrl: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CreatePostDTO {
  title: string;
  subtitle?: string | null | undefined;
  content: string;
}

export interface UpdatePostDTO {
  title?: string | undefined;
  subtitle?: string | null | undefined;
  content?: string | undefined;
}

export interface IPostRepository {
  create(data: {
    title: string;
    subtitle?: string | null | undefined;
    content: string;
    imageUrl?: string | null | undefined;
    authorId: string;
  }): Promise<IPost>;
  findById(id: string): Promise<IPost | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  findByAuthorId(authorId: string, pagination: PaginationParams): Promise<PaginatedResult<IPost>>;
  update(
    id: string,
    data: {
      title?: string | undefined;
      subtitle?: string | null | undefined;
      content?: string | undefined;
      imageUrl?: string | null | undefined;
    }
  ): Promise<IPost | null>;
  delete(id: string): Promise<boolean>;
}

export interface IImageStorage {
  upload(file: Express.Multer.File): Promise<string>;
  delete(imageUrl: string): Promise<void>;
}
