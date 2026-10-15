import type { ReactNode } from "react";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative isolate flex min-h-[70vh] items-center justify-center">
      <div aria-hidden="true" className="animate-float-a absolute top-4 left-[8%] -z-10 h-56 w-56 rounded-full bg-pink/25 blur-3xl" />
      <div aria-hidden="true" className="animate-float-b absolute right-[8%] bottom-4 -z-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />

      <div className="animate-rise w-full max-w-md">
        <p className="mb-8 text-center font-serif text-2xl font-semibold tracking-tight">
          <Link href="/" className="text-gradient">
            BlogPlatform
          </Link>
        </p>
        <div className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-xl shadow-accent/10 backdrop-blur">
          <div aria-hidden="true" className="h-1.5 w-full bg-brand-gradient" />
          <div className="p-8 sm:p-10">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
        {footer ? <p className="mt-6 text-center text-sm text-muted">{footer}</p> : null}
      </div>
    </div>
  );
}
