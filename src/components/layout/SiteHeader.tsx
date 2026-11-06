import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "Stories" },
  { href: "/photos", label: "Photos" },
  { href: "/projects", label: "Projects" },
  { href: "/certifications", label: "Certifications" },
  { href: "/links", label: "Links" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div aria-hidden className="h-[3px] bg-[image:var(--gradient-brand)]" />
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          href="/"
          className="gradient-text inline-flex min-h-11 items-center font-serif text-lg font-semibold"
        >
          Matt Rushmer
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex flex-wrap gap-x-1 gap-y-1 text-sm text-muted sm:gap-x-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center px-2 transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
