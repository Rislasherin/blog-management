"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuth } from "@/features/auth/AuthContext";
import { EditPostForm } from "@/features/posts/EditPostForm";
import { StatePanel } from "@/components/ui/StatePanel";
import { Spinner } from "@/components/ui/Spinner";
import { postService } from "@/services/post.service";
import type { Post } from "@/types/post.types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditPostPage(props: PageProps) {
  const params = use(props.params);
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await postService.getPostById(params.id);
        setPost(res.data);
      } catch (err) {
        if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
          setError("404");
        } else {
          setError("We couldn't load this post for editing. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [params.id]);

  const forbidden = !loading && post !== null && user !== null && post.authorId !== user.id;

  if (error === "404") {
    return notFound();
  }

  if (forbidden) {
    return (
      <StatePanel tone="danger" title="Not allowed" message="You don't have permission to edit this post.">
        <Link href="/" className="btn btn-secondary">
          Back to posts
        </Link>
      </StatePanel>
    );
  }

  return (
    <ProtectedRoute>
      <div className="animate-rise mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Edit your post</h1>
          <p className="mt-3 text-lg text-muted">Make changes to your publication.</p>
        </header>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-10">
          {loading ? (
            <div role="status" className="flex items-center justify-center gap-3 py-12 text-muted">
              <Spinner className="h-5 w-5 text-accent" />
              Loading post...
            </div>
          ) : error ? (
            <div role="alert" className="alert-danger">
              {error}
            </div>
          ) : post ? (
            <EditPostForm post={post} />
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}