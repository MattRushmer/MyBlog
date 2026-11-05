"use client";

import { ICON_REGISTRY } from "@/core/icons/registry";
import { Icon } from "@/components/ui/Icon";

interface IconPickerProps {
  readonly value: string;
  readonly onChange: (iconKey: string) => void;
}

/** Every valid Link.iconKey rendered as a selectable tile - never a free-text field. */
export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choose an icon">
      {ICON_REGISTRY.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onChange(entry.key)}
          title={entry.label}
          aria-label={entry.label}
          aria-pressed={value === entry.key}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-token border transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] ${
            value === entry.key ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground"
          }`}
        >
          <Icon iconKey={entry.key} className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
