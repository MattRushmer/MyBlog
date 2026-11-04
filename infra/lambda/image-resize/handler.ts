import type { S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { generateImageRenditions } from "../../../src/core/images/process";
import { DynamoContentStore } from "../../../src/adapters/content-store/aws";

const REGION = process.env.AWS_REGION ?? "ap-southeast-2";
const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME ?? "";

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const contentStore = new DynamoContentStore(ddb, CONTENT_TABLE_NAME);

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
      const original = await readObject(bucket, key);
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
    } catch (error) {
      console.error(`Image processing failed for ${key}:`, error);
      await contentStore
        .patch("photo", photoId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown image processing error",
        })
        .catch((patchError) => console.error("Failed to record failure status:", patchError));
    }
  }
};
