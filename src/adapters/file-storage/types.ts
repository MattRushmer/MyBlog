export interface StoredObject {
  readonly key: string;
  readonly bytes: number;
  readonly contentType: string;
}

export interface UploadTicket {
  readonly strategy: "post-to-app" | "presigned-put";
  readonly key: string;
  readonly url: string;
  readonly method: "POST" | "PUT";
  readonly headers?: Readonly<Record<string, string>>;
  readonly expiresAt: string;
  readonly maxBytes: number;
}

export interface CreateUploadTicketInput {
  readonly key: string;
  readonly contentType: string;
  readonly maxBytes: number;
}

export interface FileStorage {
  /** Browser uploads the original directly using this ticket. */
  createUploadTicket(input: CreateUploadTicketInput): Promise<UploadTicket>;

  put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  head(key: string): Promise<StoredObject | null>;
  delete(keys: readonly string[]): Promise<void>;

  /** Synchronous, pure URL construction: '/api/files/<key>' | 'https://<cdn>/<key>'. */
  publicUrl(key: string): string;
}
