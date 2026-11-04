import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthAdapter } from "@/adapters";
import { getSession } from "@/server/auth/require-session";
import { applyCookieMutations, dataResponse, errorResponse, handleRouteError } from "@/server/http/envelope";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/** No requireSession here - reporting "no session" without throwing is this endpoint's job. */
export async function GET() {
  try {
    const session = await getSession();
    return dataResponse({ session });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = loginSchema.parse(await request.json());
    const authAdapter = await getAuthAdapter();
    const result = await authAdapter.signIn({ username, password });

    if (result.status === "authenticated") {
      return applyCookieMutations(dataResponse({ session: result.session }), result.cookies);
    }
    if (result.status === "mfa_required") {
      return dataResponse({ challengeRequired: true, challengeToken: result.challengeToken });
    }

    const code = result.reason === "rate_limited" ? "rate_limited" : "invalid_credentials";
    const message = result.reason === "rate_limited" ? "Too many attempts - try again later" : "Invalid username or password";
    return errorResponse(code, message, 401);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  try {
    const authAdapter = await getAuthAdapter();
    const cookies = await authAdapter.signOut();
    return applyCookieMutations(dataResponse({ signedOut: true }), cookies);
  } catch (error) {
    return handleRouteError(error);
  }
}
