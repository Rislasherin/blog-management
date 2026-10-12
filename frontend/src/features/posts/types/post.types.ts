export interface Post {
  id: string;
  title: string;
  subtitle?: string | null;
  content: string;
  imageUrl: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  title: string;
  subtitle?: string | null;
  content: string;
  image?: File;
}

export interface UpdatePostInput {
  title?: string;
  subtitle?: string | null;
  content?: string;
  image?: File;
}
