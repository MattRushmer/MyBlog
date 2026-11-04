export const SESSION_COOKIE_NAME = "admin_session";
export const REFRESH_COOKIE_NAME = "admin_refresh";

export interface Session {
  readonly userId: string;
  readonly username: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface CookieMutation {
  readonly name: string;
  readonly value: string;
  /** 0 clears the cookie. */
  readonly maxAge: number;
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: "lax" | "strict";
  readonly path: string;
}

export type SignInResult =
  | { status: "authenticated"; session: Session; cookies: readonly CookieMutation[] }
  | { status: "mfa_required"; challengeToken: string; challengeType: "SOFTWARE_TOKEN_MFA" }
  | { status: "failed"; reason: "invalid_credentials" | "mfa_invalid" | "rate_limited" };

export interface AuthAdapter {
  signIn(input: { username: string; password: string }): Promise<SignInResult>;
  /** Local impl always returns { status: 'failed', reason: 'mfa_invalid' } - it never issues challenges. */
  respondToMfaChallenge(input: { challengeToken: string; code: string }): Promise<SignInResult>;
  readSession(cookies: ReadonlyMap<string, string>): Promise<Session | null>;
  signOut(): Promise<readonly CookieMutation[]>;
}
