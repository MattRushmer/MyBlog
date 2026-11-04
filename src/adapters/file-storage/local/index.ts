import fs from "node:fs/promises";
import path from "node:path";
import type { CreateUploadTicketInput, FileStorage, StoredObject, UploadTicket } from "../types";
import { resolveSafeKey } from "./safe-key";
import { LOCAL_FILES_ROUTE_PREFIX, LOCAL_UPLOAD_ROUTE } from "./route-path";

export class LocalFileStorage implements FileStorage {
  constructor(
    private readonly uploadsDir: string,
    private readonly ticketTtlSeconds: number,
  ) {}

  async createUploadTicket(input: CreateUploadTicketInput): Promise<UploadTicket> {
    const expiresAt = new Date(Date.now() + this.ticketTtlSeconds * 1000).toISOString();
    return {
      strategy: "post-to-app",
      key: input.key,
      url: `${LOCAL_UPLOAD_ROUTE}?key=${encodeURIComponent(input.key)}`,
      method: "POST",
      headers: { "content-type": input.contentType },
      expiresAt,
      maxBytes: input.maxBytes,
    };
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject> {
    const filePath = resolveSafeKey(this.uploadsDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    await fs.writeFile(`${filePath}.contenttype`, contentType, "utf-8");
    return { key, bytes: body.byteLength, contentType };
  }

  async get(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
    const filePath = resolveSafeKey(this.uploadsDir, key);
    try {
      const body = await fs.readFile(filePath);
      const contentType = await this.readContentType(filePath);
      return { body: new Uint8Array(body), contentType };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async head(key: string): Promise<StoredObject | null> {
    const filePath = resolveSafeKey(this.uploadsDir, key);
    try {
      const stat = await fs.stat(filePath);
      const contentType = await this.readContentType(filePath);
      return { key, bytes: stat.size, contentType };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(keys: readonly string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        const filePath = resolveSafeKey(this.uploadsDir, key);
        await Promise.all([removeIfExists(filePath), removeIfExists(`${filePath}.contenttype`)]);
      }),
    );
  }

  publicUrl(key: string): string {
    return `${LOCAL_FILES_ROUTE_PREFIX}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  private async readContentType(filePath: string): Promise<string> {
    try {
      return (await fs.readFile(`${filePath}.contenttype`, "utf-8")).trim();
    } catch {
      return "application/octet-stream";
    }
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}

async function removeIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
