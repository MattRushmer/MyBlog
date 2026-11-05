import type { Metadata } from "next";
import { getContentStore } from "@/adapters";
import { LinkButtonRow } from "@/components/links/LinkButtonRow";

export const metadata: Metadata = {
  title: "Links | Matt Rushmer",
  description: "Where else to find Matt Rushmer online.",
};

export default async function LinksPage() {
  const store = await getContentStore();
  const links = await store.list("link");
  const visibleLinks = links.filter((link) => link.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main id="main-content" className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">Links</h1>
      {visibleLinks.length === 0 ? (
        <p className="mt-6 text-muted">No links yet.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-3 sm:mt-10">
          {visibleLinks.map((link) => (
            <LinkButtonRow key={link.id} link={link} />
          ))}
        </div>
      )}
    </main>
  );
}
