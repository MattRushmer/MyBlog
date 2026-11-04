import "server-only";
import { cookies } from "next/headers";
import { getAuthAdapter } from "@/adapters";
import { UnauthorizedError } from "@/core/errors";
import type { Session } from "@/adapters/auth/types";

async function readCookiesAsMap(): Promise<ReadonlyMap<string, string>> {
  const store = await cookies();
  return new Map(store.getAll().map((cookie) => [cookie.name, cookie.value]));
}

/**
 * The one server-side guard both deploy modes share. Every admin page and
 * every admin API route handler must call this (or getSession) before
 * doing anything - a client-side check alone is never sufficient.
 */
export async function getSession(): Promise<Session | null> {
  const authAdapter = await getAuthAdapter();
  const cookieMap = await readCookiesAsMap();
  return authAdapter.readSession(cookieMap);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
