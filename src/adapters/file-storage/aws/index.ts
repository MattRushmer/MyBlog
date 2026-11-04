import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CreateUploadTicketInput, FileStorage, StoredObject, UploadTicket } from "../types";

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("name" in error ? (error as { name: string }).name === "NotFound" : false)
  );
}

export class S3FileStorage implements FileStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly cdnDomain: string,
    private readonly ticketTtlSeconds: number,
  ) {}

  async createUploadTicket(input: CreateUploadTicketInput): Promise<UploadTicket> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: this.ticketTtlSeconds });
    return {
      strategy: "presigned-put",
      key: input.key,
      url,
      method: "PUT",
      headers: { "content-type": input.contentType },
      expiresAt: new Date(Date.now() + this.ticketTtlSeconds * 1000).toISOString(),
      maxBytes: input.maxBytes,
    };
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return { key, bytes: body.byteLength, contentType };
  }

  async get(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const body = await result.Body?.transformToByteArray();
      if (!body) return null;
      return { body, contentType: result.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        key,
        bytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? "application/octet-stream",
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((key) => ({ Key: key })) },
      }),
    );
  }

  publicUrl(key: string): string {
    return `https://${this.cdnDomain}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}
