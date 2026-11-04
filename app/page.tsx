import { OWNER_NAME, SITE_TITLE } from "@/config/types";

export default function HomePage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-serif text-4xl text-foreground">{SITE_TITLE}</h1>
      <p className="mt-4 text-muted">
        {OWNER_NAME}&rsquo;s personal site is under construction. Stories, photos, projects,
        certifications, and links are on their way.
      </p>
    </main>
  );
}
