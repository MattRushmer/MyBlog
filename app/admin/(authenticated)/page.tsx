import Link from "next/link";
import { requireSession } from "@/server/auth/require-session";
import { getContentStore } from "@/adapters";
import { Card } from "@/components/ui/Card";
import type { EntityType } from "@/core/types";

const SECTIONS: ReadonlyArray<{ type: EntityType; label: string; href: string }> = [
  { type: "story", label: "Stories", href: "/admin/stories" },
  { type: "photo", label: "Photos", href: "/admin/photos" },
  { type: "project", label: "Projects", href: "/admin/projects" },
  { type: "certification", label: "Certifications", href: "/admin/certifications" },
  { type: "link", label: "Links", href: "/admin/links" },
];

export default async function AdminDashboardPage() {
  await requireSession();
  const store = await getContentStore();
  const counts = await Promise.all(
    SECTIONS.map(async (section) => ({
      ...section,
      count: (await store.list(section.type, { includeDrafts: true })).length,
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {counts.map((section) => (
          <Link
            key={section.type}
            href={section.href}
            className="rounded-token transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)]"
          >
            <Card className="h-full transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:border-accent">
              <p className="text-sm text-muted">{section.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{section.count}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
