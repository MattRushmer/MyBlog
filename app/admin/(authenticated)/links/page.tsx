import { requireSession } from "@/server/auth/require-session";
import { getContentStore } from "@/adapters";
import { LinksManager } from "@/components/admin/links/LinksManager";

export default async function LinksAdminPage() {
  await requireSession();
  const store = await getContentStore();
  const links = await store.list("link", { includeDrafts: true });
  const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Links</h1>
      <LinksManager initialLinks={sorted} />
    </div>
  );
}
