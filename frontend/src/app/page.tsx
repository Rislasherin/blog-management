import Link from "next/link";
import { postService } from "@/services/post.service";
import { PostCard } from "@/features/posts/PostCard";
import { CreatePostCta } from "@/features/posts/CreatePostCta";
import { HeroActions } from "@/features/home/HeroActions";
import { Pagination } from "@/components/ui/Pagination";
import { StatePanel } from "@/components/ui/StatePanel";
import type { Post } from "@/types/post.types";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;
  const pageParam = searchParams?.page;
  const page = typeof pageParam === "string" ? parseInt(pageParam, 10) : 1;
  const limit = 10;

  let posts: Post[] = [];
  let pagination = undefined;
  let hasError = false;

  try {
    const response = await postService.getAllPosts(page, limit);
    posts = response.data || [];
    pagination = response.pagination;
  } catch {
    hasError = true;
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="relative isolate pt-6 pb-4 sm:pt-12">
        <div aria-hidden="true" className="hero-grid absolute inset-x-0 -top-14 -z-10 h-[30rem]" />
        <div aria-hidden="true" className="animate-float-a absolute -top-6 right-0 -z-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <div aria-hidden="true" className="animate-float-b absolute top-24 right-1/3 -z-10 h-56 w-56 rounded-full bg-pink/20 blur-3xl" />
        <div aria-hidden="true" className="animate-float-a absolute top-40 -left-6 -z-10 h-48 w-48 rounded-full bg-cyan/20 blur-3xl" />

        <div className="max-w-3xl">
          <h1 className="animate-rise mt-6 font-serif text-5xl leading-[1.05] font-semibold tracking-tight [animation-delay:120ms] sm:text-6xl lg:text-7xl">
            <span className="text-gradient">Ideas worth reading.</span>
            <br />
            Stories worth sharing.
          </h1>
          <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-muted [animation-delay:240ms]">
            A clean space to publish your writing and discover what others in the community are thinking about.
          </p>
          <div className="animate-rise [animation-delay:360ms]">
            <HeroActions />
          </div>
        </div>
      </section>

      <section id="latest" aria-labelledby="latest-heading" className="scroll-mt-24">
        <div className="mb-8">
          <h2 id="latest-heading" className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Latest posts
          </h2>
          <div aria-hidden="true" className="mt-3 h-1.5 w-16 rounded-full bg-brand-gradient" />
        </div>

        {hasError ? (
          <StatePanel
            tone="danger"
            title="Something went wrong"
            message="We couldn't load the posts. Please try again."
          >
            <Link href={page > 1 ? `/?page=${page}` : "/"} className="btn btn-primary">
              Try again
            </Link>
          </StatePanel>
        ) : posts.length === 0 ? (
          <StatePanel title="No posts yet" message="There are no posts to display right now.">
            <CreatePostCta />
          </StatePanel>
        ) : (
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {!hasError && pagination && (
          <div className="mt-12">
            <Pagination pagination={pagination} baseUrl="/" />
          </div>
        )}
      </section>
    </div>
  );
}