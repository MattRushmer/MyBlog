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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {counts.map((section) => (
          <Link key={section.type} href={section.href}>
            <Card className="transition-colors hover:border-accent">
              <p className="text-sm text-muted">{section.label}</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{section.count}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
