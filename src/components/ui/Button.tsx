import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary: "bg-surface text-foreground border border-border hover:border-accent",
  ghost: "text-foreground hover:bg-surface",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-token px-4 py-2 text-sm font-medium " +
  "transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none";

interface ButtonOwnProps {
  readonly variant?: Variant;
  readonly children: ReactNode;
}

type ButtonProps = ButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkButtonProps = ButtonOwnProps & AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string };

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <button className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className ?? ""}`} {...rest}>
      {children}
    </button>
  );
}

/** Same visual treatment as Button, but renders an <a> for navigational actions. */
export function LinkButton({ variant = "primary", className, children, ...rest }: LinkButtonProps) {
  return (
    <a className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className ?? ""}`} {...rest}>
      {children}
    </a>
  );
}
