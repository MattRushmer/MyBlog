import Link from "next/link";
import { getContentStore, getFileStorage } from "@/adapters";
import type { Project, Story } from "@/core/types";
import { StoryCard } from "@/components/stories/StoryCard";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { OWNER_NAME } from "@/config/types";
import { loadPhotosByIds } from "@/lib/photo-lookup";

function latestStories(stories: readonly Story[], limit: number): Story[] {
  return [...stories]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}

function featuredProjects(projects: readonly Project[], limit: number): Project[] {
  return [...projects]
    .filter((project) => project.isFeatured)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit);
}

export default async function HomePage() {
  const store = await getContentStore();
  const fileStorage = await getFileStorage();

  const [stories, projects] = await Promise.all([store.list("story"), store.list("project")]);

  const recentStories = latestStories(stories, 3);
  const spotlightProjects = featuredProjects(projects, 3);

  const photoById = await loadPhotosByIds(store, [
    ...recentStories.map((story) => story.coverPhotoId),
    ...spotlightProjects.map((project) => project.screenshotPhotoId),
  ]);

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[image:var(--gradient-sky)] opacity-15 blur-3xl sm:h-80 sm:w-80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-0 -z-10 h-48 w-48 rounded-full bg-[image:var(--gradient-warm)] opacity-10 blur-3xl sm:h-64 sm:w-64"
        />
        <h1 className="gradient-text font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          {OWNER_NAME}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          I work on security and cloud solutions - hardening infrastructure, building on AWS, and
          writing up what I learn along the way. This site collects my stories, projects, and a
          few photos.
        </p>
      </section>

      {recentStories.length > 0 && (
        <section className="mt-14 sm:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="font-serif text-2xl text-foreground">Latest stories</h2>
            <Link
              href="/stories"
              className="inline-flex min-h-11 items-center text-sm text-accent transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:text-accent-hover"
            >
              All stories
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:gap-8">
            {recentStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                coverPhoto={story.coverPhotoId ? photoById.get(story.coverPhotoId) ?? null : null}
                resolveUrl={fileStorage.publicUrl}
              />
            ))}
          </div>
        </section>
      )}

      {spotlightProjects.length > 0 && (
        <section className="mt-14 sm:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="font-serif text-2xl text-foreground">Featured projects</h2>
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center text-sm text-accent transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:text-accent-hover"
            >
              All projects
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {spotlightProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                screenshot={project.screenshotPhotoId ? photoById.get(project.screenshotPhotoId) ?? null : null}
                resolveUrl={fileStorage.publicUrl}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
