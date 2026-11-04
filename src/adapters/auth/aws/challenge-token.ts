/**
 * Cognito's own "Session" string only continues the challenge - it doesn't
 * carry the username RespondToAuthChallenge needs. AWS mode runs behind a
 * Lambda where two requests in one login flow may land on different
 * instances, so we can't cache that mapping in memory. Instead the
 * challengeToken we hand back to the browser is a stateless, self-contained
 * encoding of both values.
 */
interface ChallengePayload {
  readonly cognitoSession: string;
  readonly username: string;
}

export function encodeChallengeToken(payload: ChallengePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function decodeChallengeToken(token: string): ChallengePayload {
  const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
  if (typeof parsed.cognitoSession !== "string" || typeof parsed.username !== "string") {
    throw new Error("Malformed challenge token");
  }
  return parsed as ChallengePayload;
}
