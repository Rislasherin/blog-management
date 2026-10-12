"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthContext";

export function HeroActions() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      {!loading && (
        <Link href={isAuthenticated ? "/posts/create" : "/register"} className="btn btn-primary">
          {isAuthenticated ? "Create a Post" : "Create an account"}
        </Link>
      )}
      <a href="#latest" className="btn btn-secondary">
        Explore Posts
      </a>
      {!loading && !isAuthenticated && (
        <Link href="/login" className="px-2 text-sm font-medium text-accent hover:underline">
          Sign in
        </Link>
      )}
    </div>
  );
}