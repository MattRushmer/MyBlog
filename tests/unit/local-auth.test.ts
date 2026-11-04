import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";
import { LocalAuthAdapter } from "@/adapters/auth/local";
import { SESSION_COOKIE_NAME } from "@/adapters/auth/types";

describe("LocalAuthAdapter", () => {
  let adapter: LocalAuthAdapter;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    adapter = new LocalAuthAdapter({
      username: "matt",
      passwordHash,
      sessionSecret: "a".repeat(32),
      sessionTtlSeconds: 3600,
      secureCookies: false,
    });
  });

  it("rejects an unknown username", async () => {
    const result = await adapter.signIn({ username: "nobody", password: "whatever" });
    expect(result).toEqual({ status: "failed", reason: "invalid_credentials" });
  });

  it("rejects a wrong password", async () => {
    const result = await adapter.signIn({ username: "matt", password: "nope" });
    expect(result).toEqual({ status: "failed", reason: "invalid_credentials" });
  });

  it("authenticates with the correct password and issues a session cookie", async () => {
    const result = await adapter.signIn({ username: "matt", password: "correct-password" });
    expect(result.status).toBe("authenticated");
    if (result.status !== "authenticated") throw new Error("unreachable");

    expect(result.session.username).toBe("matt");
    expect(result.cookies).toHaveLength(1);
    expect(result.cookies[0].name).toBe(SESSION_COOKIE_NAME);
    expect(result.cookies[0].httpOnly).toBe(true);
    expect(result.cookies[0].secure).toBe(false);
  });

  it("readSession verifies the issued cookie and rejects a tampered one", async () => {
    const signIn = await adapter.signIn({ username: "matt", password: "correct-password" });
    if (signIn.status !== "authenticated") throw new Error("unreachable");

    const validCookies = new Map([[SESSION_COOKIE_NAME, signIn.cookies[0].value]]);
    const session = await adapter.readSession(validCookies);
    expect(session?.username).toBe("matt");

    const tamperedCookies = new Map([[SESSION_COOKIE_NAME, `${signIn.cookies[0].value}x`]]);
    expect(await adapter.readSession(tamperedCookies)).toBeNull();

    expect(await adapter.readSession(new Map())).toBeNull();
  });

  it("never issues an MFA challenge", async () => {
    const result = await adapter.respondToMfaChallenge({ challengeToken: "x", code: "123456" });
    expect(result).toEqual({ status: "failed", reason: "mfa_invalid" });
  });

  it("rate limits after repeated failures", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const limiterAdapter = new LocalAuthAdapter({
      username: "rate-test",
      passwordHash,
      sessionSecret: "b".repeat(32),
      sessionTtlSeconds: 3600,
      secureCookies: false,
    });

    for (let i = 0; i < 5; i += 1) {
      await limiterAdapter.signIn({ username: "rate-test", password: "wrong" });
    }
    const result = await limiterAdapter.signIn({ username: "rate-test", password: "wrong" });
    expect(result).toEqual({ status: "failed", reason: "rate_limited" });
  });

  it("signOut returns a cookie mutation that clears the session", async () => {
    const [cookie] = await adapter.signOut();
    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.maxAge).toBe(0);
    expect(cookie.value).toBe("");
  });
});
