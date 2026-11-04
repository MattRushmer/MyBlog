import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NotFoundError, UnauthorizedError, ValidationError } from "@/core/errors";
import type { CookieMutation } from "@/adapters/auth/types";

export function dataResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Applies every cookie an AuthAdapter returned (sign-in, MFA, sign-out) onto a response. */
export function applyCookieMutations(response: NextResponse, cookies: readonly CookieMutation[]): NextResponse {
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      path: cookie.path,
    });
  }
  return response;
}

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}

/**
 * The one place every admin route handler's catch block delegates to, so
 * NotFoundError/ValidationError/UnauthorizedError/ZodError map to the same
 * HTTP status everywhere instead of being reimplemented per route.
 */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return errorResponse("unauthorized", error.message, 401);
  }
  if (error instanceof NotFoundError) {
    return errorResponse("not_found", error.message, 404);
  }
  if (error instanceof ValidationError) {
    return errorResponse("validation_error", error.message, 400);
  }
  if (error instanceof ZodError) {
    return errorResponse("validation_error", formatZodError(error), 400);
  }
  console.error("Unhandled admin route error:", error);
  return errorResponse("internal_error", "Unexpected server error", 500);
}
