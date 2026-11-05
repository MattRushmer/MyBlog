import { OWNER_NAME } from "@/config/types";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted sm:px-6">
        &copy; {year} {OWNER_NAME}
      </div>
    </footer>
  );
}
