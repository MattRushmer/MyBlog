import "server-only";
import { loadConfig } from "@/config";
import type { ContentStore } from "./content-store/types";
import type { FileStorage } from "./file-storage/types";
import type { ImageProcessor } from "./image-processing/types";
import type { AuthAdapter } from "./auth/types";

let contentStore: ContentStore | null = null;
let fileStorage: FileStorage | null = null;
let imageProcessor: ImageProcessor | null = null;
let authAdapter: AuthAdapter | null = null;

/**
 * Four memoized factories, each switching on config.deployTarget via a
 * dynamic import of the concrete module. This keeps the AWS SDK out of the
 * local bundle and sharp/node:fs out of the AWS Lambda bundle - the two
 * implementations of a given adapter are never imported in the same
 * process at once in practice, but dynamic import makes that explicit
 * rather than relying on tree-shaking to notice.
 */

export async function getContentStore(): Promise<ContentStore> {
  if (contentStore) return contentStore;
  const config = loadConfig();

  if (config.deployTarget === "local") {
    const { LocalContentStore } = await import("./content-store/local");
    contentStore = new LocalContentStore(config.local!.dataDir);
  } else {
    const [{ DynamoContentStore }, { createDynamoDocumentClient }] = await Promise.all([
      import("./content-store/aws"),
      import("./content-store/aws/client"),
    ]);
    contentStore = new DynamoContentStore(
      createDynamoDocumentClient(config.aws!.region),
      config.aws!.contentTableName,
    );
  }
  return contentStore;
}

export async function getFileStorage(): Promise<FileStorage> {
  if (fileStorage) return fileStorage;
  const config = loadConfig();

  if (config.deployTarget === "local") {
    const { LocalFileStorage } = await import("./file-storage/local");
    fileStorage = new LocalFileStorage(config.local!.uploadsDir, config.limits.uploadTicketTtlSeconds);
  } else {
    const [{ S3FileStorage }, { createS3Client }] = await Promise.all([
      import("./file-storage/aws"),
      import("./file-storage/aws/client"),
    ]);
    fileStorage = new S3FileStorage(
      createS3Client(config.aws!.region),
      config.aws!.photosBucket,
      config.aws!.cdnDomain,
      config.limits.uploadTicketTtlSeconds,
    );
  }
  return fileStorage;
}

export async function getImageProcessor(): Promise<ImageProcessor> {
  if (imageProcessor) return imageProcessor;
  const config = loadConfig();

  if (config.deployTarget === "local") {
    const [{ LocalImageProcessor }, storage] = await Promise.all([
      import("./image-processing/local"),
      getFileStorage(),
    ]);
    imageProcessor = new LocalImageProcessor(storage);
  } else {
    const { LambdaImageProcessor } = await import("./image-processing/aws");
    imageProcessor = new LambdaImageProcessor();
  }
  return imageProcessor;
}

export async function getAuthAdapter(): Promise<AuthAdapter> {
  if (authAdapter) return authAdapter;
  const config = loadConfig();
  const secureCookies = config.site.url.startsWith("https://");

  if (config.deployTarget === "local") {
    const { LocalAuthAdapter } = await import("./auth/local");
    authAdapter = new LocalAuthAdapter({
      username: config.local!.adminUsername,
      passwordHash: config.local!.adminPasswordHash,
      sessionSecret: config.local!.sessionSecret,
      sessionTtlSeconds: config.limits.sessionTtlSeconds,
      secureCookies,
    });
  } else {
    const [{ CognitoAuthAdapter }, { createCognitoClient }] = await Promise.all([
      import("./auth/aws"),
      import("./auth/aws/client"),
    ]);
    authAdapter = new CognitoAuthAdapter({
      client: createCognitoClient(config.aws!.region),
      region: config.aws!.region,
      userPoolId: config.aws!.cognito.userPoolId,
      clientId: config.aws!.cognito.clientId,
      clientSecret: config.aws!.cognito.clientSecret,
      sessionTtlSeconds: config.limits.sessionTtlSeconds,
      secureCookies,
    });
  }
  return authAdapter;
}

/** Test-only: clears all memoized adapters so tests can reconstruct them with fresh config. */
export function resetAdaptersForTests(): void {
  contentStore = null;
  fileStorage = null;
  imageProcessor = null;
  authAdapter = null;
}
