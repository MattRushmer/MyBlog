import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthAdapter } from "@/adapters";
import { applyCookieMutations, dataResponse, errorResponse, handleRouteError } from "@/server/http/envelope";

const mfaSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(1),
});

/**
 * Local mode's LocalAuthAdapter never issues a challenge, so this route is
 * exercised only in AWS mode - built now for parity, as the brief requires.
 */
export async function POST(request: NextRequest) {
  try {
    const { challengeToken, code } = mfaSchema.parse(await request.json());
    const authAdapter = await getAuthAdapter();
    const result = await authAdapter.respondToMfaChallenge({ challengeToken, code });

    if (result.status === "authenticated") {
      return applyCookieMutations(dataResponse({ session: result.session }), result.cookies);
    }
    if (result.status === "mfa_required") {
      return dataResponse({ challengeRequired: true, challengeToken: result.challengeToken });
    }

    const errorCode =
      result.reason === "rate_limited" ? "rate_limited" : result.reason === "mfa_invalid" ? "mfa_invalid" : "invalid_credentials";
    return errorResponse(errorCode, "MFA verification failed", 401);
  } catch (error) {
    return handleRouteError(error);
  }
}
