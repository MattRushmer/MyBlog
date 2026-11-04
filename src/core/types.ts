export type { Story, StoryInput } from "./schemas/story";
export type { Photo, PhotoKind, PhotoStatus, PhotoUpdate } from "./schemas/photo";
export type { Project, ProjectInput } from "./schemas/project";
export type { Certification, CertificationInput } from "./schemas/certification";
export type { Link, LinkInput } from "./schemas/link";
export type { Rendition, RenditionFormat } from "./schemas/common";

import type { Story } from "./schemas/story";
import type { Photo } from "./schemas/photo";
import type { Project } from "./schemas/project";
import type { Certification } from "./schemas/certification";
import type { Link } from "./schemas/link";

export type EntityType = "story" | "photo" | "project" | "certification" | "link";

export interface EntityMap {
  story: Story;
  photo: Photo;
  project: Project;
  certification: Certification;
  link: Link;
}
