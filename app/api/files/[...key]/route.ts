import { NextRequest, NextResponse } from "next/server";
import { getFileStorage } from "@/adapters";

interface RouteContext {
  readonly params: Promise<{ key: string[] }>;
}

/**
 * This exact path is LOCAL_FILES_ROUTE_PREFIX, hardcoded into the local
 * file-storage adapter's publicUrl(). Deliberately unauthenticated -
 * public photos must be viewable without a session, the same way
 * CloudFront serves them in AWS mode.
 *
 * Only 'photos/*' (generated renditions) is servable, never 'originals/*'
 * - CloudFront in AWS mode only has a behavior for photos/*, so this route
 * replicates that posture rather than exposing the whole uploads directory.
 * In AWS mode this route doesn't exist at all: CloudFront serves photos/*
 * directly, bypassing Next.js entirely.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  if (process.env.DEPLOY_TARGET === "aws") {
    return new NextResponse(null, { status: 404 });
  }

  const { key: keySegments } = await context.params;
  const key = keySegments.join("/");
  if (!key.startsWith("photos/")) {
    return new NextResponse(null, { status: 404 });
  }

  const fileStorage = await getFileStorage();
  const object = await fileStorage.get(key);
  if (!object) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(Buffer.from(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
