import "server-only";
import { z } from "zod";
import { awsEnvSchema, localEnvSchema, sharedEnvSchema } from "./schema";
import { OWNER_NAME, SITE_DESCRIPTION, SITE_TITLE, type AppConfig } from "./types";

export { SITE_TITLE, OWNER_NAME, SITE_DESCRIPTION } from "./types";
export type { AppConfig } from "./types";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}

function buildConfig(env: NodeJS.ProcessEnv): AppConfig {
  const sharedResult = sharedEnvSchema.safeParse(env);
  if (!sharedResult.success) {
    throw new ConfigError(`Invalid shared configuration:\n${formatZodError(sharedResult.error)}`);
  }
  const shared = sharedResult.data;

  const site = {
    url: shared.SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    ownerName: OWNER_NAME,
  };
  const limits = {
    maxUploadBytes: shared.MAX_UPLOAD_BYTES,
    uploadTicketTtlSeconds: shared.UPLOAD_TICKET_TTL_SECONDS,
    sessionTtlSeconds: shared.SESSION_TTL_SECONDS,
  };

  if (shared.DEPLOY_TARGET === "local") {
    const localResult = localEnvSchema.safeParse(env);
    if (!localResult.success) {
      throw new ConfigError(
        `DEPLOY_TARGET=local but required local-mode variables are missing or invalid:\n${formatZodError(localResult.error)}`,
      );
    }
    const local = localResult.data;
    return {
      deployTarget: "local",
      site,
      limits,
      local: {
        dataDir: local.DATA_DIR,
        uploadsDir: local.UPLOADS_DIR,
        adminUsername: local.ADMIN_USERNAME,
        adminPasswordHash: local.ADMIN_PASSWORD_HASH,
        sessionSecret: local.SESSION_SECRET,
      },
      aws: null,
    };
  }

  const awsResult = awsEnvSchema.safeParse(env);
  if (!awsResult.success) {
    throw new ConfigError(
      `DEPLOY_TARGET=aws but required aws-mode variables are missing or invalid:\n${formatZodError(awsResult.error)}`,
    );
  }
  const aws = awsResult.data;
  return {
    deployTarget: "aws",
    site,
    limits,
    local: null,
    aws: {
      region: aws.AWS_REGION,
      contentTableName: aws.CONTENT_TABLE_NAME,
      isrTableName: aws.ISR_TABLE_NAME,
      photosBucket: aws.PHOTOS_BUCKET_NAME,
      cdnDomain: aws.CDN_DOMAIN,
      cognito: {
        userPoolId: aws.COGNITO_USER_POOL_ID,
        clientId: aws.COGNITO_CLIENT_ID,
        clientSecret: aws.COGNITO_CLIENT_SECRET ?? null,
      },
    },
  };
}

let cached: AppConfig | null = null;

/**
 * Loads and validates config from process.env on first call, then returns
 * the cached result. Throws ConfigError with a readable list of problems
 * rather than letting the app start in a half-configured state.
 */
export function loadConfig(): AppConfig {
  if (cached === null) {
    cached = buildConfig(process.env);
  }
  return cached;
}

/** Test-only: clears the memoized config so tests can reload with different env vars. */
export function resetConfigForTests(): void {
  cached = null;
}
