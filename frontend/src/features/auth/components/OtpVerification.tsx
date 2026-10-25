"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/api-client";
import { authService } from "../services/auth.service";

interface OtpVerificationProps {
  name: string;
  email: string;
  password: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function OtpVerification({
  name,
  email,
  password,
  onSuccess,
  onBack,
}: OtpVerificationProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(60);

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
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOtp({
        email,
        code: cleanCode,
        name,
        password,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid OTP or verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError("");
    setSuccessMsg("");
    setResending(true);

    try {
      const response = await authService.resendOtp(email);
      if (!response || response.success === false) {
        setError(response?.message || "Failed to resend verification code.");
        return;
      }

      setSuccessMsg("A new verification code has been sent to your email.");
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
    <div>
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
          <p className="mt-2 text-xs text-muted">
            Check your inbox for the code sent to <strong className="text-foreground">{email}</strong>
          </p>
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
            "Verify & Create Account"
          )}
        </button>

        <div className="flex items-center justify-between pt-2 text-sm">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="text-muted hover:text-foreground transition-colors"
          >
            ← Change details
          </button>

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
    </div>
  );
}

export default OtpVerification;
