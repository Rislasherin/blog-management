"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "@/components/ui/Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <Spinner className="h-6 w-6 text-accent" />
        <p className="text-sm">{loading ? "Loading..." : "Redirecting to sign in..."}</p>
      </div>
    );
  }

  return <>{children}</>;
}
