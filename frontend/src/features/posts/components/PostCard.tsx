import Image from "next/image";
import Link from "next/link";
import type { Post } from "../types/post.types";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const dateStr = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const excerpt = post.content.length > 150 ? post.content.substring(0, 150) + "..." : post.content;
  const tone = Array.from(post.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 5;
  const initial = post.title.trim().charAt(0).toUpperCase();

  return (
    <article
      data-testid="post-card"
      className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs"
    >
      <Link href={`/posts/${post.id}`} className="relative aspect-[16/10] w-full overflow-hidden bg-surface-raised">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            data-tone={tone}
            className="card-art flex h-full w-full items-center justify-center p-6 text-center"
          >
            <span className="font-serif text-5xl font-bold tracking-tight text-foreground/20 select-none">
              {initial || "B"}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <time dateTime={post.createdAt}>{dateStr}</time>
          <span aria-hidden="true">•</span>
          <span>Story</span>
        </div>

        <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-foreground group-hover:text-accent">
          <Link href={`/posts/${post.id}`} className="focus:outline-none">
            {post.title}
          </Link>
        </h2>

        {post.subtitle && (
          <p className="mt-1.5 text-sm font-medium text-muted">
            {post.subtitle}
          </p>
        )}

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{excerpt}</p>

        <div className="mt-auto pt-6">
          <Link
            href={`/author/${post.authorId}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-accent"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
              ✍
            </span>
            <span>Author {post.authorId.slice(-6)}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
