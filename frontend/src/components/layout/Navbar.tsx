"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useState } from "react";

function NavLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex min-h-11 items-center text-sm font-semibold transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-1.5 after:h-[3px] after:origin-left after:rounded-full after:bg-brand-gradient after:transition-transform after:duration-300 ${
        active
          ? "text-foreground after:scale-x-100"
          : "text-muted after:scale-x-0 hover:text-foreground hover:after:scale-x-100"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/75 backdrop-blur-lg">
      <div aria-hidden="true" className="h-1 w-full bg-brand-gradient" />
      <nav aria-label="Main" className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 font-serif text-xl font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-base text-white shadow-md shadow-accent/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
          >
            B
          </span>
          <span className="text-gradient">BlogPlatform</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {!loading &&
            (isAuthenticated ? (
              <>
                <NavLink href="/" className="hidden sm:inline-flex">Home</NavLink>
                <NavLink href="/posts/create">Create Post</NavLink>
                <span className="hidden max-w-[10rem] truncate rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent md:block">
                  {user?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="min-h-11 text-sm font-semibold text-muted transition-colors duration-200 hover:text-danger"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink href="/login">Login</NavLink>
                <Link href="/register" className="btn btn-primary">
                  Register
                </Link>
              </>
            ))}
        </div>
      </nav>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </header>
  );
}