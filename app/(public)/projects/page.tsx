import type { Metadata } from "next";
import { getContentStore, getFileStorage } from "@/adapters";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { loadPhotosByIds } from "@/lib/photo-lookup";

export const metadata: Metadata = {
  title: "Projects | Matt Rushmer",
  description: "Projects built around security and cloud solutions.",
};

export default async function ProjectsPage() {
  const store = await getContentStore();
  const fileStorage = await getFileStorage();

  const projects = await store.list("project");
  const sorted = [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
  const photoById = await loadPhotosByIds(store, sorted.map((project) => project.screenshotPhotoId));

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl text-foreground">Projects</h1>
      {sorted.length === 0 ? (
        <p className="mt-6 text-muted">No projects published yet.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {sorted.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              screenshot={project.screenshotPhotoId ? photoById.get(project.screenshotPhotoId) ?? null : null}
              resolveUrl={fileStorage.publicUrl}
            />
          ))}
        </div>
      )}
    </main>
  );
}
