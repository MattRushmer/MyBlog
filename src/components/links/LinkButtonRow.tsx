import type { Link as LinkEntity } from "@/core/types";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const HTTP_URL_PATTERN = /^https?:\/\//i;

export function LinkButtonRow({ link }: { readonly link: LinkEntity }) {
  const isExternal = HTTP_URL_PATTERN.test(link.url);

  return (
    <LinkButton
      href={link.url}
      variant="secondary"
      className="w-full justify-start gap-3 py-3 text-left text-base"
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <Icon iconKey={link.iconKey} className="h-5 w-5 text-accent" />
      <span>
        <span className="block font-medium">{link.label}</span>
        {link.description && <span className="block text-sm text-muted">{link.description}</span>}
      </span>
    </LinkButton>
  );
}
