import { randomUUID } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "ttb_guest";
const MAX_AGE = 60 * 60 * 24 * 400; // ~13 months

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Ensures `ttb_guest` cookie exists; returns token (creates cookie if missing). */
export async function ensureGuestToken(): Promise<{ token: string }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && existing.length > 8) return { token: existing };
  const token = randomUUID();
  jar.set(COOKIE, token, cookieOpts());
  return { token };
}

export async function getGuestTokenFromCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}
