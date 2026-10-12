"use client";

import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { CreatePostForm } from "@/features/posts/CreatePostForm";

export default function CreatePostPage() {
  return (
    <ProtectedRoute>
      <div className="animate-rise mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Create a new post</h1>
          <p className="mt-3 text-lg text-muted">Share something worth reading.</p>
        </header>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-10">
          <CreatePostForm />
        </div>
      </div>
    </ProtectedRoute>
  );
}