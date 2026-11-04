import type { ComponentType, SVGProps } from "react";
import { FaGithub, FaInstagram, FaLinkedin, FaMastodon, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { Briefcase, FileText, Globe, Link as LinkIcon, Mail, Rss } from "lucide-react";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface IconEntry {
  readonly key: string;
  readonly label: string;
  readonly Icon: IconComponent;
}

/**
 * Every valid Link.iconKey, matched against src/core/schemas/link.ts's
 * `(brand|generic):[a-z0-9-]+` pattern. The admin icon picker only ever
 * shows this finite list - never an open-ended icon name field - so a
 * typo can't silently produce a blank icon on the public Links page.
 *
 * Brand marks come from Font Awesome Free (react-icons/fa6), not
 * simple-icons: simple-icons removed its LinkedIn icon after a trademark
 * takedown request, and this site needs LinkedIn by name.
 */
export const ICON_REGISTRY: readonly IconEntry[] = [
  { key: "brand:github", label: "GitHub", Icon: FaGithub },
  { key: "brand:linkedin", label: "LinkedIn", Icon: FaLinkedin },
  { key: "brand:youtube", label: "YouTube", Icon: FaYoutube },
  { key: "brand:x", label: "X (Twitter)", Icon: FaXTwitter },
  { key: "brand:instagram", label: "Instagram", Icon: FaInstagram },
  { key: "brand:mastodon", label: "Mastodon", Icon: FaMastodon },
  { key: "generic:mail", label: "Email", Icon: Mail },
  { key: "generic:link", label: "Link", Icon: LinkIcon },
  { key: "generic:globe", label: "Website", Icon: Globe },
  { key: "generic:rss", label: "RSS", Icon: Rss },
  { key: "generic:document", label: "Document", Icon: FileText },
  { key: "generic:work", label: "Work", Icon: Briefcase },
] as const;

const ICON_BY_KEY = new Map(ICON_REGISTRY.map((entry) => [entry.key, entry]));

export function isValidIconKey(key: string): boolean {
  return ICON_BY_KEY.has(key);
}

export function getIconEntry(key: string): IconEntry | undefined {
  return ICON_BY_KEY.get(key);
}
