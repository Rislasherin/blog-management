"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, AuthShell } from "@/features/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/api-client";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const flowParam = (searchParams.get("flow") || "signup") as "signup" | "reset";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    if (!email) {
      setError("Email address is missing. Please restart the process.");
      return;
    }

    setLoading(true);

    try {
      if (flowParam === "reset") {
        const response = await authService.verifyResetOtp(email, cleanCode);
        const tokenQuery = response.resetToken
          ? `&token=${encodeURIComponent(response.resetToken)}`
          : "";
        router.push(
          `/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(cleanCode)}${tokenQuery}`
        );
      } else {
        // For standalone signup verification:
        // If registration credentials were saved in sessionStorage, retrieve and verify
        const pendingReg = typeof window !== "undefined"
          ? sessionStorage.getItem("pending_registration")
          : null;

        if (pendingReg) {
          try {
            const parsed = JSON.parse(pendingReg);
            await authService.verifyOtp({
              email,
              code: cleanCode,
              name: parsed.name,
              password: parsed.password,
            });
            sessionStorage.removeItem("pending_registration");
            setSuccessMsg("Account verified successfully! Redirecting to login...");
            setTimeout(() => {
              router.push("/login");
            }, 1500);
            return;
          } catch {
            // fallback if parse fails
          }
        }

        setError("Registration details expired. Please sign up again.");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid or expired code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending || !email) return;
    setError("");
    setSuccessMsg("");
    setResending(true);

    try {
      if (flowParam === "reset") {
        await authService.forgotPassword(email);
        setSuccessMsg("A fresh reset code has been sent to your email.");
      } else {
        await authService.resendOtp(email);
        setSuccessMsg("A fresh signup verification code has been sent.");
      }
      setCountdown(60);
      setCode("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title={flowParam === "reset" ? "Verify Reset Code" : "Verify Your Account"}
      subtitle={
        email
          ? `We sent a 6-digit code to ${email}`
          : "Please enter your 6-digit verification code."
      }
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

      {successMsg && (
        <div role="status" className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label htmlFor="otp-code" className="field-label">
            6-Digit Verification Code
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="field text-center text-2xl tracking-widest font-mono"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.trim().length !== 6}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </button>

        <div className="flex items-center justify-between pt-2 text-sm">
          <Link
            href={flowParam === "reset" ? "/forgot-password" : "/register"}
            className="text-muted hover:text-foreground transition-colors"
          >
            ← {flowParam === "reset" ? "Change email" : "Back to sign up"}
          </Link>

          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || resending || loading}
            className={`font-medium ${
              countdown > 0
                ? "text-muted cursor-not-allowed"
                : "text-accent hover:underline cursor-pointer"
            }`}
          >
            {resending
              ? "Sending..."
              : countdown > 0
              ? `Resend in ${countdown}s`
              : "Resend Code"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Verify Code" subtitle="Loading verification form...">
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8 text-accent" />
          </div>
        </AuthShell>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
