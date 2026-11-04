import { OWNER_NAME } from "@/config/types";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-muted">
        &copy; {year} {OWNER_NAME}
      </div>
    </footer>
  );
}
