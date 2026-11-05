import type { Photo, Project } from "@/core/types";
import { Card } from "@/components/ui/Card";
import { Picture } from "@/components/ui/Picture";
import { Tag } from "@/components/ui/Tag";
import { LinkButton } from "@/components/ui/Button";

interface ProjectCardProps {
  readonly project: Project;
  readonly screenshot: Photo | null;
  readonly resolveUrl: (key: string) => string;
}

export function ProjectCard({ project, screenshot, resolveUrl }: ProjectCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      {screenshot && (
        <Picture
          renditions={screenshot.renditions}
          width={screenshot.width}
          height={screenshot.height}
          alt={screenshot.altText}
          blurDataUrl={screenshot.blurDataUrl}
          resolveUrl={resolveUrl}
          sizes="(min-width: 768px) 500px, 100vw"
        />
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-serif text-xl leading-snug text-foreground">{project.title}</h3>
        <p className="mt-2 flex-1 text-base leading-relaxed text-muted">{project.description}</p>
        {project.techTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.techTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        {(project.repoUrl || project.liveUrl) && (
          <div className="mt-5 flex flex-wrap gap-3">
            {project.repoUrl && (
              <LinkButton
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
              >
                Repository
              </LinkButton>
            )}
            {project.liveUrl && (
              <LinkButton href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                Live site
              </LinkButton>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
