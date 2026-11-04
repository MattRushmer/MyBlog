import fs from "node:fs/promises";
import path from "node:path";
import { LocalContentStore } from "@/adapters/content-store/local";
import { LocalFileStorage } from "@/adapters/file-storage/local";
import { ensureEnvLocal } from "./seed/ensure-env-local";
import { createSeedPhoto } from "./seed/create-photo";
import { buildSeedCertifications, buildSeedLinks, buildSeedProjects, buildSeedStories } from "./seed/fixtures";

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.resolve(PROJECT_ROOT, process.env.DATA_DIR ?? "./data");
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, process.env.UPLOADS_DIR ?? "./data/uploads");

/** Wipes ./data so re-running the seed produces the same fixed set of content, not duplicates. */
async function resetDataDir(): Promise<void> {
  await fs.rm(DATA_DIR, { recursive: true, force: true });
}

async function main(): Promise<void> {
  await ensureEnvLocal(PROJECT_ROOT);
  await resetDataDir();

  const contentStore = new LocalContentStore(DATA_DIR);
  const fileStorage = new LocalFileStorage(UPLOADS_DIR, 300);

  const stories = buildSeedStories();
  const projects = buildSeedProjects();
  const certifications = buildSeedCertifications();
  const links = buildSeedLinks();

  console.log("Generating placeholder photos and running them through the real image pipeline...");
  const [cover, inlineForStory1, gallery1, gallery2, screenshot1, screenshot2] = await Promise.all([
    createSeedPhoto(fileStorage, {
      label: "Cover",
      kind: "story",
      storyId: stories[0].id,
      altText: "Placeholder cover image",
      caption: null,
      sortOrder: 0,
      paletteIndex: 0,
    }),
    createSeedPhoto(fileStorage, {
      label: "Inline",
      kind: "story",
      storyId: stories[0].id,
      altText: "Placeholder inline image",
      caption: "A placeholder inline image.",
      sortOrder: 1,
      paletteIndex: 1,
    }),
    createSeedPhoto(fileStorage, {
      label: "Gallery One",
      kind: "gallery",
      storyId: null,
      altText: "Placeholder gallery photo one",
      caption: "[Placeholder] From the gallery.",
      sortOrder: 0,
      paletteIndex: 2,
    }),
    createSeedPhoto(fileStorage, {
      label: "Gallery Two",
      kind: "gallery",
      storyId: null,
      altText: "Placeholder gallery photo two",
      caption: "[Placeholder] Another gallery shot.",
      sortOrder: 1,
      paletteIndex: 3,
    }),
    createSeedPhoto(fileStorage, {
      label: "Screenshot One",
      kind: "asset",
      storyId: null,
      altText: "Placeholder project screenshot",
      caption: null,
      sortOrder: 0,
      paletteIndex: 4,
      width: 1600,
      height: 900,
    }),
    createSeedPhoto(fileStorage, {
      label: "Screenshot Two",
      kind: "asset",
      storyId: null,
      altText: "Placeholder project screenshot",
      caption: null,
      sortOrder: 0,
      paletteIndex: 5,
      width: 1600,
      height: 900,
    }),
  ]);

  stories[0] = { ...stories[0], coverPhotoId: cover.id };
  projects[0] = { ...projects[0], screenshotPhotoId: screenshot1.id };
  projects[1] = { ...projects[1], screenshotPhotoId: screenshot2.id };

  console.log("Writing content...");
  await Promise.all([
    ...stories.map((story) => contentStore.put("story", story)),
    ...projects.map((project) => contentStore.put("project", project)),
    ...certifications.map((cert) => contentStore.put("certification", cert)),
    ...links.map((link) => contentStore.put("link", link)),
    contentStore.put("photo", cover),
    contentStore.put("photo", inlineForStory1),
    contentStore.put("photo", gallery1),
    contentStore.put("photo", gallery2),
    contentStore.put("photo", screenshot1),
    contentStore.put("photo", screenshot2),
  ]);

  console.log(
    `Seeded ${stories.length} stories, ${projects.length} projects, ${certifications.length} certifications, ${links.length} links, and 6 photos.`,
  );
  console.log(`Data written to: ${DATA_DIR}`);
  console.log(`Uploads written to: ${UPLOADS_DIR}`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
