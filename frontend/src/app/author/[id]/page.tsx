import Link from "next/link";
import { postService, PostCard, type Post } from "@/features/posts";
import { Pagination } from "@/components/ui/Pagination";
import { StatePanel } from "@/components/ui/StatePanel";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AuthorPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const authorId = params.id;
  const pageParam = searchParams?.page;
  const page = typeof pageParam === "string" ? parseInt(pageParam, 10) : 1;
  const limit = 10;

  let posts: Post[] = [];
  let pagination = undefined;
  let hasError = false;

  try {
    const response = await postService.getPostsByAuthor(authorId, page, limit);
    posts = response.data || [];
    pagination = response.pagination;
  } catch {
    hasError = true;
  }

  if (hasError) {
    return (
      <StatePanel tone="danger" title="Something went wrong" message="We couldn't load this author's posts. Please try again.">
        <Link href={page > 1 ? `/author/${authorId}?page=${page}` : `/author/${authorId}`} className="btn btn-primary">
          Try again
        </Link>
      </StatePanel>
    );
  }

  return (
    <div className="space-y-12">
      <header className="animate-rise border-b border-line pb-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Author</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Author {authorId.substring(authorId.length - 6)}
        </h1>
        <p className="mt-3 text-lg text-muted">Posts by this author</p>
      </header>

      {posts.length === 0 ? (
        <StatePanel title="No posts yet" message="This author hasn't published anything yet." />
      ) : (
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {pagination && <Pagination pagination={pagination} baseUrl={`/author/${authorId}`} />}
    </div>
  );
}