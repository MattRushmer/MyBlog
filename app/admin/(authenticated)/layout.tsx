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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-foreground hover:text-accent">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{username}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
