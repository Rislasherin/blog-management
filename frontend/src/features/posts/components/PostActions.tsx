"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";
import { postService } from "../services/post.service";
import { ApiError } from "@/lib/api/api-client";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface PostActionsProps {
  postId: string;
  authorId: string;
}

export function PostActions({ postId, authorId }: PostActionsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user || user.id !== authorId) {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      await postService.deletePost(postId);
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while deleting.");
      }
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-12 border-t border-line pt-6">
      {error && (
        <div role="alert" className="alert-danger mb-4">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/posts/${postId}/edit`} className="btn btn-secondary">
          Edit Post
        </Link>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isDeleting}
          className="btn btn-danger"
        >
          {isDeleting ? (
            <>
              <Spinner className="h-4 w-4" />
              Deleting...
            </>
          ) : (
            "Delete Post"
          )}
        </button>
      </div>

      <ConfirmModal
        isOpen={isModalOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}
