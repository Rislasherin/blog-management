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
