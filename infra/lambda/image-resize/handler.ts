import type { S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { generateImageRenditions } from "../../../src/core/images/process";
import { DynamoContentStore } from "../../../src/adapters/content-store/aws";
import { sniffImageType } from "../../../src/server/uploads/sniff-image-type";

const REGION = process.env.AWS_REGION ?? "ap-southeast-2";
const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME ?? "";

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const contentStore = new DynamoContentStore(ddb, CONTENT_TABLE_NAME);

/** A deliberately bad/unrecognized image: mark the photo failed, no point retrying. */
class InvalidImageError extends Error {}

/** originals/{photoId}.{ext} - the prefix split from the S3 trigger means renditions never re-trigger this function. */
function extractPhotoId(key: string): string | null {
  const match = key.match(/^originals\/([^./]+)\./);
  return match ? match[1] : null;
}

async function readObject(bucket: string, key: string): Promise<Buffer> {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object body for ${key}`);
  return Buffer.from(bytes);
}

async function processRecord(bucket: string, key: string, photoId: string): Promise<void> {
  const original = await readObject(bucket, key);

  // The admin upload flow (app/api/admin/uploads/blob) sniffs magic bytes
  // before accepting a local-mode upload, but AWS mode's presigned PUT
  // lets the browser write directly to S3 - this Lambda is the only place
  // left to ever check that what landed in originals/ is actually an
  // image, never trusting the browser-declared Content-Type.
  if (!sniffImageType(original)) {
    throw new InvalidImageError(`Rejected upload for ${key}: not a recognized JPEG/PNG/WebP`);
  }

  const generated = await generateImageRenditions(original, photoId);

  await Promise.all(
    generated.renditions.map((rendition) => {
      const contentType = rendition.format === "jpeg" ? "image/jpeg" : `image/${rendition.format}`;
      return s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: rendition.key,
          Body: rendition.buffer,
          ContentType: contentType,
        }),
      );
    }),
  );

  await contentStore.patch("photo", photoId, {
    width: generated.width,
    height: generated.height,
    renditions: generated.renditions.map(({ buffer: _buffer, ...rendition }) => rendition),
    blurDataUrl: generated.blurDataUrl,
    status: "ready",
    error: null,
  });
}

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const photoId = extractPhotoId(key);

    if (!photoId) {
      console.error(`Could not extract photoId from key: ${key}`);
      continue;
    }

    try {
      await processRecord(bucket, key, photoId);
    } catch (error) {
      if (!(error instanceof InvalidImageError)) {
        // A transient S3/DynamoDB/network failure, not a bad image. Mark
        // nothing and rethrow so this async Lambda invocation reports
        // failure to the Lambda service, which retries automatically
        // (twice, by default) - swallowing this unconditionally and
        // always returning success, as the previous version did, meant a
        // transient failure got recorded as a permanent one with no retry
        // ever happening.
        console.error(`Transient failure processing ${key}, will retry:`, error);
        throw error;
      }

      console.error(`Image processing failed for ${key}:`, error);
      await contentStore
        .patch("photo", photoId, {
          status: "failed",
          error: error.message,
        })
        .catch((patchError) => console.error("Failed to record failure status:", patchError));
    }
  }
};
