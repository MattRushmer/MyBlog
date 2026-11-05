import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/require-session";
import { UnauthorizedError } from "@/core/errors";
import { SignOutButton } from "@/components/admin/SignOutButton";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/certifications", label: "Certifications" },
  { href: "/admin/links", label: "Links" },
] as const;

/**
 * The one guarded layout in app/admin/** - every page under this route
 * group inherits requireSession() here. Login lives outside this group
 * (app/admin/login) specifically so it is never gated by itself.
 */
export default async function AuthenticatedAdminLayout({ children }: { children: ReactNode }) {
  let username: string;
  try {
    username = (await requireSession()).username;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/admin/login");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Admin navigation" className="flex flex-wrap items-center gap-x-1 gap-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex min-h-11 flex-wrap items-center gap-3">
            <span className="text-sm text-muted">{username}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
