import { createHmac } from "node:crypto";
import {
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  type CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { LoginRateLimiter } from "../rate-limit";
import {
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type AuthAdapter,
  type CookieMutation,
  type Session,
  type SignInResult,
} from "../types";
import { decodeChallengeToken, encodeChallengeToken } from "./challenge-token";

export interface CognitoAuthAdapterOptions {
  readonly client: CognitoIdentityProviderClient;
  readonly region: string;
  readonly userPoolId: string;
  readonly clientId: string;
  readonly clientSecret: string | null;
  readonly sessionTtlSeconds: number;
  readonly secureCookies: boolean;
}

function isCognitoError(error: unknown, name: string): boolean {
  return typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === name;
}

export class CognitoAuthAdapter implements AuthAdapter {
  private readonly rateLimiter = new LoginRateLimiter();
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(private readonly options: CognitoAuthAdapterOptions) {
    this.issuer = `https://cognito-idp.${options.region}.amazonaws.com/${options.userPoolId}`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async signIn(input: { username: string; password: string }): Promise<SignInResult> {
    const key = input.username.toLowerCase();
    if (this.rateLimiter.isRateLimited(key)) {
      return { status: "failed", reason: "rate_limited" };
    }

    try {
      const response = await this.options.client.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: this.options.clientId,
          AuthParameters: {
            USERNAME: input.username,
            PASSWORD: input.password,
            ...this.secretHashParam(input.username),
          },
        }),
      );

      if (response.ChallengeName === "SOFTWARE_TOKEN_MFA" && response.Session) {
        this.rateLimiter.recordSuccess(key);
        return {
          status: "mfa_required",
          challengeToken: encodeChallengeToken({ cognitoSession: response.Session, username: input.username }),
          challengeType: "SOFTWARE_TOKEN_MFA",
        };
      }

      if (response.AuthenticationResult?.IdToken) {
        this.rateLimiter.recordSuccess(key);
        return this.buildAuthenticatedResult(response.AuthenticationResult.IdToken, response.AuthenticationResult.RefreshToken);
      }

      this.rateLimiter.recordFailure(key);
      return { status: "failed", reason: "invalid_credentials" };
    } catch (error) {
      if (isCognitoError(error, "NotAuthorizedException") || isCognitoError(error, "UserNotFoundException")) {
        this.rateLimiter.recordFailure(key);
        return { status: "failed", reason: "invalid_credentials" };
      }
      if (isCognitoError(error, "TooManyRequestsException") || isCognitoError(error, "LimitExceededException")) {
        return { status: "failed", reason: "rate_limited" };
      }
      throw error;
    }
  }

  async respondToMfaChallenge(input: { challengeToken: string; code: string }): Promise<SignInResult> {
    let decoded: { cognitoSession: string; username: string };
    try {
      decoded = decodeChallengeToken(input.challengeToken);
    } catch {
      return { status: "failed", reason: "mfa_invalid" };
    }

    try {
      const response = await this.options.client.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: "SOFTWARE_TOKEN_MFA",
          ClientId: this.options.clientId,
          Session: decoded.cognitoSession,
          ChallengeResponses: {
            USERNAME: decoded.username,
            SOFTWARE_TOKEN_MFA_CODE: input.code,
            ...this.secretHashParam(decoded.username),
          },
        }),
      );

      if (response.AuthenticationResult?.IdToken) {
        return this.buildAuthenticatedResult(response.AuthenticationResult.IdToken, response.AuthenticationResult.RefreshToken);
      }
      return { status: "failed", reason: "mfa_invalid" };
    } catch {
      return { status: "failed", reason: "mfa_invalid" };
    }
  }

  async readSession(cookies: ReadonlyMap<string, string>): Promise<Session | null> {
    const idToken = cookies.get(SESSION_COOKIE_NAME);
    if (!idToken) return null;
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.issuer,
        audience: this.options.clientId,
      });
      const username = typeof payload["cognito:username"] === "string" ? payload["cognito:username"] : payload.sub;
      if (!payload.sub || !username) return null;
      return {
        userId: payload.sub,
        username,
        issuedAt: payload.iat ?? 0,
        expiresAt: payload.exp ?? 0,
      };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<readonly CookieMutation[]> {
    return [this.buildCookie(SESSION_COOKIE_NAME, "", 0), this.buildCookie(REFRESH_COOKIE_NAME, "", 0)];
  }

  private async buildAuthenticatedResult(idToken: string, refreshToken: string | undefined): Promise<SignInResult> {
    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: this.issuer,
      audience: this.options.clientId,
    });
    const username = typeof payload["cognito:username"] === "string" ? payload["cognito:username"] : payload.sub;
    if (!payload.sub || !username) {
      return { status: "failed", reason: "invalid_credentials" };
    }

    const cookies: CookieMutation[] = [
      this.buildCookie(SESSION_COOKIE_NAME, idToken, this.options.sessionTtlSeconds),
    ];
    if (refreshToken) {
      cookies.push(this.buildCookie(REFRESH_COOKIE_NAME, refreshToken, 30 * 24 * 60 * 60));
    }

    return {
      status: "authenticated",
      session: {
        userId: payload.sub,
        username,
        issuedAt: payload.iat ?? 0,
        expiresAt: payload.exp ?? 0,
      },
      cookies,
    };
  }

  private secretHashParam(username: string): Record<string, string> {
    if (!this.options.clientSecret) return {};
    const hmac = createHmac("sha256", this.options.clientSecret);
    hmac.update(username + this.options.clientId);
    return { SECRET_HASH: hmac.digest("base64") };
  }

  private buildCookie(name: string, value: string, maxAge: number): CookieMutation {
    return {
      name,
      value,
      maxAge,
      httpOnly: true,
      secure: this.options.secureCookies,
      sameSite: "lax",
      path: "/",
    };
  }
}
