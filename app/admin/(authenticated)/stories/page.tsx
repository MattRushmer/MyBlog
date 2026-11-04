import { requireSession } from "@/server/auth/require-session";
import { getContentStore } from "@/adapters";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";

export default async function StoriesAdminPage() {
  await requireSession();
  const store = await getContentStore();
  const stories = await store.list("story", { includeDrafts: true });
  const sorted = [...stories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Stories</h1>
        <LinkButton href="/admin/stories/new">New story</LinkButton>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && <p className="text-muted">No stories yet.</p>}
        {sorted.map((story) => (
          <div key={story.id} className="flex items-center justify-between rounded-token border border-border bg-surface p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{story.title}</span>
                <Badge tone={story.status === "published" ? "accent" : "neutral"}>{story.status}</Badge>
                {story.isFeatured && <Badge tone="accent">Featured</Badge>}
              </div>
              <p className="text-sm text-muted">/{story.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <LinkButton variant="secondary" href={`/admin/stories/${story.id}`}>
                Edit
              </LinkButton>
              <DeleteEntityButton endpoint={`/api/admin/stories/${story.id}`} label="story" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
