"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService, AuthShell, OtpVerification } from "@/features/auth";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api/api-client";
import { PasswordInput } from "@/components/ui/PasswordInput";

type RegisterStep = "FORM" | "OTP" | "SUCCESS";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

export default function RegisterPage() {
  const [step, setStep] = useState<RegisterStep>("FORM");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      errors.name = "Full name is required";
    } else if (cleanName.length < 2) {
      errors.name = "Full name must be at least 2 characters long";
    } else if (cleanName.length > 100) {
      errors.name = "Full name cannot exceed 100 characters";
    } else if (!NAME_REGEX.test(cleanName)) {
      errors.name = "Full name can only contain letters, spaces, hyphens, and apostrophes";
    }

    if (!cleanEmail) {
      errors.email = "Email address is required";
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = "Please enter a valid email address";
    } else if (cleanEmail.length > 254) {
      errors.email = "Email address cannot exceed 254 characters";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.trim().length === 0) {
      errors.password = "Password cannot be empty or whitespace only";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    } else if (password.length > 128) {
      errors.password = "Password cannot exceed 128 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);

    try {
      const response = await authService.register(cleanName, cleanEmail, password);
      if (!response || response.success === false) {
        setError(response?.message || "Failed to send verification code. Please check your email configuration.");
        return;
      }
      setStep("OTP");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setFieldErrors({
            name: err.errors.name?.[0],
            email: err.errors.email?.[0],
            password: err.errors.password?.[0],
          });
        }
        setError(err.message);
      } else {
        setError("An unexpected error occurred while sending verification email. Please try again.");
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

      <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="name" className="field-label">Full name</label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            className={`field ${fieldErrors.name ? "border-red-500 focus:ring-red-500" : ""}`}
            placeholder="John Doe"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="name-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            className={`field ${fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""}`}
            placeholder="you@example.com"
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <PasswordInput
            id="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            className={`field ${fieldErrors.password ? "border-red-500 focus:ring-red-500" : ""}`}
            placeholder="At least 8 characters"
            disabled={loading}
            minLength={8}
            toggleLabel="password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="field-label">Confirm Password</label>
          <PasswordInput
            id="confirmPassword"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            className={`field ${fieldErrors.confirmPassword ? "border-red-500 focus:ring-red-500" : ""}`}
            placeholder="Confirm your password"
            disabled={loading}
            minLength={8}
            toggleLabel="confirm password"
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          {fieldErrors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {fieldErrors.confirmPassword}
            </p>
          )}
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