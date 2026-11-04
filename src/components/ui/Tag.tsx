interface TagProps {
  readonly children: string;
}

/** A small neutral pill for tags/tech stack labels - not a status indicator (see Badge for that). */
export function Tag({ children }: TagProps) {
  return (
    <span className="rounded-token border border-border bg-surface px-2.5 py-1 text-xs text-muted">{children}</span>
  );
}
