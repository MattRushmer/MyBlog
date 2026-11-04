import { NextRequest } from "next/server";
import { loadConfig } from "@/config";
import { getFileStorage } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { dataResponse, errorResponse, handleRouteError } from "@/server/http/envelope";
import { sniffImageType } from "@/server/uploads/sniff-image-type";

/**
 * This exact path is LOCAL_UPLOAD_ROUTE, hardcoded into the local
 * file-storage adapter's ticket URL - the browser POSTs the raw original
 * bytes here directly. Content-Type is never trusted: the actual bytes are
 * sniffed, and only an 'originals/' key is ever accepted so this can't
 * become an arbitrary-file-write endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();

    const key = request.nextUrl.searchParams.get("key");
    if (!key || !key.startsWith("originals/")) {
      return errorResponse("invalid_key", "key must be provided and start with 'originals/'", 400);
    }

    const config = loadConfig();
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength === 0) {
      return errorResponse("empty_body", "Upload body is empty", 400);
    }
    if (bytes.byteLength > config.limits.maxUploadBytes) {
      return errorResponse(
        "payload_too_large",
        `Upload exceeds the maximum allowed size of ${config.limits.maxUploadBytes} bytes`,
        413,
      );
    }

    const sniffed = sniffImageType(bytes);
    if (!sniffed) {
      return errorResponse("invalid_image", "File content is not a recognized image type", 400);
    }

    const fileStorage = await getFileStorage();
    const stored = await fileStorage.put(key, bytes, sniffed);
    return dataResponse(stored);
  } catch (error) {
    return handleRouteError(error);
  }
}
