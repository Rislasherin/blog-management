import type { ReactNode } from "react";

interface StatePanelProps {
  title: string;
  message: string;
  tone?: "neutral" | "danger";
  children?: ReactNode;
}

export function StatePanel({ title, message, tone = "neutral", children }: StatePanelProps) {
  const danger = tone === "danger";

  return (
    <div
      role={danger ? "alert" : undefined}
      className={`mx-auto max-w-xl rounded-2xl border px-6 py-12 text-center sm:px-10 ${
        danger ? "border-danger/20 bg-danger-soft" : "border-line bg-surface"
      }`}
    >
      <h2 className={`font-serif text-2xl font-semibold ${danger ? "text-danger" : "text-foreground"}`}>{title}</h2>
      <p className="mt-3 text-muted">{message}</p>
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}