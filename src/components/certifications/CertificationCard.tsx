import type { Certification, Photo } from "@/core/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { formatYearMonth } from "@/lib/format";

interface CertificationCardProps {
  readonly certification: Certification;
  readonly badgePhoto: Photo | null;
  readonly resolveUrl: (key: string) => string;
}

export function CertificationCard({ certification, badgePhoto, resolveUrl }: CertificationCardProps) {
  const isInProgress = certification.state === "in-progress";

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-token bg-background">
        {badgePhoto ? (
          <Picture
            renditions={badgePhoto.renditions}
            width={48}
            height={48}
            alt={badgePhoto.altText}
            resolveUrl={resolveUrl}
            className="h-12 w-12 [&_img]:h-12 [&_img]:w-12 [&_img]:object-cover"
          />
        ) : certification.badgeIconKey ? (
          <Icon iconKey={certification.badgeIconKey} className="h-6 w-6 text-accent" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-xl leading-snug text-foreground">{certification.name}</h2>
          {isInProgress && <Badge tone="accent">In progress</Badge>}
        </div>
        <p className="mt-1 text-muted">{certification.issuer}</p>

        {isInProgress ? (
          certification.progressNote && <p className="mt-2 text-sm text-muted">{certification.progressNote}</p>
        ) : (
          certification.issuedOn && (
            <p className="mt-2 text-sm text-muted">Issued {formatYearMonth(certification.issuedOn)}</p>
          )
        )}

        {certification.credentialUrl && (
          <a
            href={certification.credentialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center text-sm text-accent transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease)] hover:text-accent-hover"
          >
            View credential
          </a>
        )}
      </div>
    </Card>
  );
}
