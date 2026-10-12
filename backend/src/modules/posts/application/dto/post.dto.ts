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
