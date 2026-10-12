import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/types/post.types";

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
      className={`card-enter tone-${tone} group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_26px_44px_-26px_var(--from)]`}
    >
      {post.imageUrl ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-background">
          <Image
            src={post.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div aria-hidden="true" className="tone-bar absolute inset-x-0 top-0 h-1.5" />
        </div>
      ) : (
        <div aria-hidden="true" className="tone-block relative h-36 overflow-hidden">
          <span className="absolute -right-3 -bottom-10 font-serif text-[9rem] leading-none font-semibold text-white/25 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-110">
            {initial}
          </span>
          <span className="absolute top-5 left-6 h-10 w-10 rounded-full bg-white/20 transition-transform duration-500 group-hover:translate-x-3" />
          <span className="absolute top-14 left-20 h-4 w-4 rounded-full bg-white/30" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <time dateTime={post.createdAt} className="tone-chip inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold">
          {dateStr}
        </time>
        <h3 className="mt-4 font-serif text-2xl leading-snug font-semibold tracking-tight">
          <Link
            href={`/posts/${post.id}`}
            className="transition-colors duration-200 group-hover:text-(--from) after:absolute after:inset-0 after:content-['']"
          >
            {post.title}
          </Link>
        </h3>
        {post.subtitle && (
          <p className="mt-1 text-sm font-medium text-accent line-clamp-1">{post.subtitle}</p>
        )}
        <p className={`mt-3 flex-1 text-muted ${post.imageUrl ? "line-clamp-3" : "line-clamp-4"}`}>{excerpt}</p>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
          <Link
            href={`/author/${post.authorId}`}
            className="relative z-10 font-medium text-muted transition-colors duration-200 hover:text-(--from)"
          >
            Author {post.authorId.substring(post.authorId.length - 6)}
          </Link>
          <span className="read-pill">
            Read <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </div>
    </article>
  );
}