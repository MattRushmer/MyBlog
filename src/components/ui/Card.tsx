import type { ReactNode } from "react";

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** A soft-elevated surface: a light border plus a faint sky-tinted shadow, not a heavy drop shadow. */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-token border border-border bg-surface p-6 shadow-sm shadow-accent/5 transition-shadow duration-[var(--motion-duration-base)] ease-[var(--motion-ease)] hover:shadow-md hover:shadow-accent/10 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
