"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService, AuthShell } from "@/features/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword(cleanEmail);
      // Navigate to dedicated OTP verification page with reset flow context
      router.push(`/verify-otp?email=${encodeURIComponent(cleanEmail)}&flow=reset`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to send reset code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a 6-digit verification code."
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
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Sending reset code...
            </>
          ) : (
            "Send Reset Code"
          )}
        </button>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
