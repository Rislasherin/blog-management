import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { postService } from "@/services/post.service";
import { PostActions } from "@/features/posts/PostActions";
import { StatePanel } from "@/components/ui/StatePanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostDetailPage(props: PageProps) {
  const params = await props.params;

  let post;
  let notFoundError = false;
  let hasError = false;

  try {
    const response = await postService.getPostById(params.id);
    post = response.data;
    if (!post) {
      notFoundError = true;
    }
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
      notFoundError = true;
    } else if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 400) {
      notFoundError = true;
    } else {
      hasError = true;
    }
  }

  if (notFoundError) {
    notFound();
  }

  if (hasError || !post) {
    return (
      <StatePanel
        tone="danger"
        title="Something went wrong"
        message="We couldn't load this post. It may have been deleted, or the server may be unavailable."
      >
        <Link href={`/posts/${params.id}`} className="btn btn-primary">
          Try again
        </Link>
        <Link href="/" className="btn btn-secondary">
          Back to posts
        </Link>
      </StatePanel>
    );
  }

  const dateStr = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="animate-rise mx-auto max-w-3xl">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-muted transition-colors duration-200 hover:text-accent">
        <span aria-hidden="true" className="mr-1">&larr;</span> Back to posts
      </Link>

      <header className="mt-4 border-b border-line pb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Post</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-3 text-lg sm:text-xl text-muted [overflow-wrap:anywhere]">
            {post.subtitle}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <Link href={`/author/${post.authorId}`} className="font-medium text-foreground transition-colors duration-200 hover:text-accent">
            Author {post.authorId.substring(post.authorId.length - 6)}
          </Link>
          <span aria-hidden="true">&middot;</span>
          <time dateTime={post.createdAt}>{dateStr}</time>
        </div>
      </header>

      {post.imageUrl && (
        <div className="relative my-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line bg-background">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className={post.imageUrl ? "" : "mt-10"}>
        <div className="post-body">{post.content}</div>
      </div>

      <PostActions postId={post.id} authorId={post.authorId} />
    </article>
  );
}