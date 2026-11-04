export const SITE_TITLE = "Matt Rushmer | Security and Cloud Solutions";
export const OWNER_NAME = "Matthew Rushmer";
export const SITE_DESCRIPTION =
  "Personal site, stories, and projects from Matthew Rushmer, covering security and cloud solutions.";

export interface AppConfig {
  readonly deployTarget: "local" | "aws";
  readonly site: {
    readonly url: string;
    readonly title: string;
    readonly description: string;
    readonly ownerName: string;
  };
  readonly limits: {
    readonly maxUploadBytes: number;
    readonly uploadTicketTtlSeconds: number;
    readonly sessionTtlSeconds: number;
  };
  readonly local: {
    readonly dataDir: string;
    readonly uploadsDir: string;
    readonly adminUsername: string;
    readonly adminPasswordHash: string;
    readonly sessionSecret: string;
  } | null;
  readonly aws: {
    readonly region: string;
    readonly contentTableName: string;
    readonly isrTableName: string;
    readonly photosBucket: string;
    readonly cdnDomain: string;
    readonly cognito: {
      readonly userPoolId: string;
      readonly clientId: string;
      readonly clientSecret: string | null;
    };
  } | null;
}
