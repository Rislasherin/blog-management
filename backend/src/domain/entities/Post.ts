export interface PostProps {
  id?: string;
  _id?: string;
  title: string;
  subtitle?: string | null | undefined;
  content: string;
  imageUrl?: string | null | undefined;
  authorId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPost {
  id: string;
  _id?: string;
  title: string;
  subtitle: string | null;
  content: string;
  imageUrl: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Post
 * Encapsulates blog post invariants and ownership business rules.
 */
export class Post implements IPost {
  public readonly id: string;
  public readonly _id?: string;
  public title: string;
  public subtitle: string | null;
  public content: string;
  public imageUrl: string | null;
  public readonly authorId: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: PostProps) {
    this.id = props.id ?? props._id ?? "";
    this._id = this.id;
    this.title = props.title.trim();
    this.subtitle = props.subtitle && props.subtitle.trim().length > 0 ? props.subtitle.trim() : null;
    this.content = props.content.trim();
    this.imageUrl = props.imageUrl ?? null;
    this.authorId = props.authorId;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.title || this.title.length === 0) {
      throw new Error("Post title cannot be empty");
    }
    if (!this.content || this.content.length === 0) {
      throw new Error("Post content cannot be empty");
    }
    if (!this.authorId) {
      throw new Error("Post authorId is required");
    }
    if (this.subtitle && this.subtitle.length > 200) {
      throw new Error("Post subtitle cannot exceed 200 characters");
    }
  }

  public isAuthoredBy(userId: string): boolean {
    return this.authorId === userId;
  }

  public update(props: {
    title?: string | undefined;
    subtitle?: string | null | undefined;
    content?: string | undefined;
    imageUrl?: string | null | undefined;
  }): void {
    if (props.title !== undefined) {
      this.title = props.title.trim();
    }
    if (props.subtitle !== undefined) {
      this.subtitle = props.subtitle && props.subtitle.trim().length > 0 ? props.subtitle.trim() : null;
    }
    if (props.content !== undefined) {
      this.content = props.content.trim();
    }
    if (props.imageUrl !== undefined) {
      this.imageUrl = props.imageUrl;
    }
    this.updatedAt = new Date();
    this.validate();
  }

  public toPlain(): IPost {
    return {
      id: this.id,
      _id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      content: this.content,
      imageUrl: this.imageUrl,
      authorId: this.authorId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Post;
