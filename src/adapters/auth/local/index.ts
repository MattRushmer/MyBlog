import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { LoginRateLimiter } from "../rate-limit";
import {
  SESSION_COOKIE_NAME,
  type AuthAdapter,
  type CookieMutation,
  type Session,
  type SignInResult,
} from "../types";

export interface LocalAuthAdapterOptions {
  readonly username: string;
  readonly passwordHash: string;
  readonly sessionSecret: string;
  readonly sessionTtlSeconds: number;
  readonly secureCookies: boolean;
}

export class LocalAuthAdapter implements AuthAdapter {
  private readonly secretKey: Uint8Array;
  private readonly rateLimiter = new LoginRateLimiter();

  constructor(private readonly options: LocalAuthAdapterOptions) {
    this.secretKey = new TextEncoder().encode(options.sessionSecret);
  }

  async signIn(input: { username: string; password: string }): Promise<SignInResult> {
    const key = input.username.toLowerCase();
    if (this.rateLimiter.isRateLimited(key)) {
      return { status: "failed", reason: "rate_limited" };
    }

    if (input.username !== this.options.username) {
      this.rateLimiter.recordFailure(key);
      return { status: "failed", reason: "invalid_credentials" };
    }

    const passwordMatches = await bcrypt.compare(input.password, this.options.passwordHash);
    if (!passwordMatches) {
      this.rateLimiter.recordFailure(key);
      return { status: "failed", reason: "invalid_credentials" };
    }

    this.rateLimiter.recordSuccess(key);
    return this.issueSession(input.username);
  }

  async respondToMfaChallenge(_input: { challengeToken: string; code: string }): Promise<SignInResult> {
    return { status: "failed", reason: "mfa_invalid" };
  }

  async readSession(cookies: ReadonlyMap<string, string>): Promise<Session | null> {
    const token = cookies.get(SESSION_COOKIE_NAME);
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.secretKey);
      if (typeof payload.sub !== "string" || typeof payload.username !== "string") return null;
      return {
        userId: payload.sub,
        username: payload.username,
        issuedAt: payload.iat ?? 0,
        expiresAt: payload.exp ?? 0,
      };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<readonly CookieMutation[]> {
    return [this.buildCookie("", 0)];
  }

  private async issueSession(username: string): Promise<SignInResult> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.options.sessionTtlSeconds;
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(username)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(this.secretKey);

    return {
      status: "authenticated",
      session: { userId: username, username, issuedAt, expiresAt },
      cookies: [this.buildCookie(token, this.options.sessionTtlSeconds)],
    };
  }

  private buildCookie(value: string, maxAge: number): CookieMutation {
    return {
      name: SESSION_COOKIE_NAME,
      value,
      maxAge,
      httpOnly: true,
      secure: this.options.secureCookies,
      sameSite: "lax",
      path: "/",
    };
  }
}
