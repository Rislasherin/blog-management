"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService, AuthShell, OtpVerification } from "@/features/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/api-client";
import { PasswordInput } from "@/components/ui/PasswordInput";

type RegisterStep = "FORM" | "OTP" | "SUCCESS";

export default function RegisterPage() {
  const [step, setStep] = useState<RegisterStep>("FORM");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
      await authService.register(name, email, password);
      setStep("OTP");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setStep("SUCCESS");
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  if (step === "SUCCESS") {
    return (
      <AuthShell
        title="Account created"
        subtitle="Your account is ready. Taking you to sign in..."
        footer={
          <Link href="/login" className="font-medium text-accent hover:underline">
            Go to sign in now
          </Link>
        }
      >
        <div role="status" className="flex items-center gap-3 text-sm text-muted">
          <Spinner className="h-4 w-4 text-accent" />
          Redirecting to login...
        </div>
      </AuthShell>
    );
  }

  if (step === "OTP") {
    return (
      <AuthShell
        title="Verify your email"
        subtitle="Please enter the 6-digit code sent to your email."
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <OtpVerification
          name={name}
          email={email}
          password={password}
          onSuccess={handleOtpSuccess}
          onBack={() => setStep("FORM")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the community and start publishing."
      footer={
        <>
          Already have an account?{" "}
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

      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="field-label">Full name</label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="John Doe"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="field-label">Email</label>
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

        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <PasswordInput
            id="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            placeholder="At least 8 characters"
            disabled={loading}
            minLength={8}
            toggleLabel="password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="field-label">Confirm Password</label>
          <PasswordInput
            id="confirmPassword"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field"
            placeholder="Confirm your password"
            disabled={loading}
            minLength={8}
            toggleLabel="confirm password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Sending verification code...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </AuthShell>
  );
}