type BadgeTone = "accent" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  accent: "bg-accent/10 text-accent",
  neutral: "bg-border text-muted",
};

interface BadgeProps {
  readonly children: string;
  readonly tone?: BadgeTone;
}

/** A status indicator (draft, in-progress, featured) - distinct from Tag's neutral labeling role. */
export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span className={`rounded-token px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}>{children}</span>
  );
}
