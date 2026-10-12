"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthContext";

export function CreatePostCta() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Link href="/posts/create" className="btn btn-primary">
      Create a Post
    </Link>
  );
}
