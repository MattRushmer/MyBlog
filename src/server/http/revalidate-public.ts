import "server-only";
import { revalidatePath } from "next/cache";

/**
 * In local/production mode (`npm run build && npm start`), the public
 * pages under app/(public)/ are statically generated at build time - a
 * server component calling getContentStore() directly has no idea an
 * admin mutation just happened. Without this, every admin edit would be
 * invisible on the live site until the next full rebuild, which defeats
 * the point of having an admin UI at all.
 *
 * Revalidating the whole (public) layout tree (rather than computing the
 * exact affected path per entity type/slug) is a deliberate, simple
 * choice for a low-traffic personal site: every admin write is already
 * rare and interactive, so re-rendering a dozen static pages on the next
 * request is cheap, and it's correct for every entity type without
 * needing to track which pages reference which story/project/photo id.
 */
export function revalidatePublicPages(): void {
  revalidatePath("/", "layout");
}
