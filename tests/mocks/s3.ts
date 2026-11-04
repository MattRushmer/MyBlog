import { S3Client } from "@aws-sdk/client-s3";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";

interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

/**
 * Minimal in-memory S3 simulator behind aws-sdk-client-mock, enough to
 * exercise the real S3FileStorage logic without touching real AWS.
 * Fake credentials are required so @aws-sdk/s3-request-presigner can
 * compute a SigV4 signature for createUploadTicket - it signs locally and
 * never makes a network call, so fake keys are fine.
 */
export function createMockS3Client(): { client: S3Client; reset: () => void } {
  let objects = new Map<string, StoredObject>();

  const client = new S3Client({
    region: "test-region",
    credentials: { accessKeyId: "test-access-key", secretAccessKey: "test-secret-key" },
  });
  const s3Mock = mockClient(client);

  s3Mock.on(PutObjectCommand).callsFake((input) => {
    objects.set(input.Key as string, {
      body: input.Body as Uint8Array,
      contentType: (input.ContentType as string) ?? "application/octet-stream",
    });
    return {};
  });

  s3Mock.on(GetObjectCommand).callsFake((input) => {
    const object = objects.get(input.Key as string);
    if (!object) {
      const error = new Error("NotFound");
      error.name = "NotFound";
      throw error;
    }
    return {
      ContentType: object.contentType,
      Body: { transformToByteArray: async () => object.body },
    };
  });

  s3Mock.on(HeadObjectCommand).callsFake((input) => {
    const object = objects.get(input.Key as string);
    if (!object) {
      const error = new Error("NotFound");
      error.name = "NotFound";
      throw error;
    }
    return { ContentType: object.contentType, ContentLength: object.body.byteLength };
  });

  s3Mock.on(DeleteObjectsCommand).callsFake((input) => {
    for (const object of input.Delete?.Objects ?? []) {
      if (object.Key) objects.delete(object.Key);
    }
    return {};
  });

  return {
    client,
    reset: () => {
      objects = new Map<string, StoredObject>();
    },
  };
}
