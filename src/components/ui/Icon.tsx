import { getIconEntry } from "@/core/icons/registry";

interface IconProps {
  readonly iconKey: string;
  readonly className?: string;
  readonly "aria-hidden"?: boolean;
}

/** Renders a curated icon by registry key. Unknown keys render nothing rather than crash. */
export function Icon({ iconKey, className, ...rest }: IconProps) {
  const entry = getIconEntry(iconKey);
  if (!entry) return null;

  const { Icon: IconComponent } = entry;
  return <IconComponent className={className} aria-hidden={rest["aria-hidden"] ?? true} />;
}
