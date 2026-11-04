import type { ReactNode } from "react";

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** A surface with restrained elevation - a border, not a drop shadow, to stay flat and calm. */
export function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-token border border-border bg-surface p-6 ${className ?? ""}`}>{children}</div>
  );
}
