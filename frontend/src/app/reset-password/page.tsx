"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, AuthShell } from "@/features/auth";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/api-client";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const code = searchParams.get("code") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email address is missing. Please request a new password reset.");
      return;
    }

    if (!token && !code) {
      setError("Reset verification token or code is missing. Please restart the reset process.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        email,
        password,
        resetToken: token || undefined,
        code: code || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please try again or request a new code.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthShell
        title="Password reset successfully!"
        subtitle="Your password has been updated. You can now sign in with your new credentials."
        footer={
          <Link href="/login" className="font-medium text-accent hover:underline">
            Go to sign in now
          </Link>
        }
      >
        <div className="space-y-4">
          <div role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
            Password changed successfully! Redirecting you to sign in...
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-muted">
            <Spinner className="h-4 w-4 text-accent" />
            Redirecting to login...
          </div>
        </div>
      </AuthShell>
    );
  }

  if (!email || (!token && !code)) {
    return (
      <AuthShell
        title="Invalid Reset Session"
        subtitle="We couldn't find the necessary verification details to reset your password."
        footer={
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-6">
          <div role="alert" className="alert-danger">
            This password reset link is invalid, incomplete, or expired.
          </div>
          <Link
            href="/forgot-password"
            className="btn btn-primary w-full inline-flex justify-center"
          >
            Request New Reset Code
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create new password"
      subtitle={`Enter a strong new password for ${email}`}
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <div role="alert" className="alert-danger mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="field-label">
            New Password
          </label>
          <PasswordInput
            id="new-password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            placeholder="At least 8 characters"
            disabled={loading}
            minLength={8}
            toggleLabel="new password"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="field-label">
            Confirm New Password
          </label>
          <PasswordInput
            id="confirm-password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field"
            placeholder="Re-enter your new password"
            disabled={loading}
            minLength={8}
            toggleLabel="confirm password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || password.length < 8 || password !== confirmPassword}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Updating password...
            </>
          ) : (
            "Reset Password"
          )}
        </button>

        <div className="text-center pt-2">
          <Link
            href="/forgot-password"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Request a different code
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Reset Password" subtitle="Loading reset form...">
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8 text-accent" />
          </div>
        </AuthShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
