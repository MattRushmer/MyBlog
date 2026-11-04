import path from "node:path";
import type { EntityType } from "@/core/types";

const FILE_NAMES: Record<EntityType, string> = {
  story: "stories.json",
  photo: "photos.json",
  project: "projects.json",
  certification: "certifications.json",
  link: "links.json",
};

export function entityFilePath(dataDir: string, type: EntityType): string {
  return path.join(dataDir, FILE_NAMES[type]);
}
