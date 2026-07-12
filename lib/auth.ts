import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Authentification simple par mot de passe partagé, adaptée à un outil privé
// utilisé par les fiancés. Le cookie de session contient un jeton déterministe
// dérivé du mot de passe + secret, jamais le mot de passe lui-même.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mariage2026";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "grace-and-love-for-a-fresh-start";

export const SESSION_COOKIE = "mjn_session";

export function sessionToken(): string {
  return createHash("sha256")
    .update(`${ADMIN_PASSWORD}:${SESSION_SECRET}`)
    .digest("hex");
}

export function verifyPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isValidSession(value: string | undefined | null): boolean {
  if (!value) return false;
  const expected = Buffer.from(sessionToken());
  const got = Buffer.from(value);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

/** À utiliser dans les Server Components / Route Handlers (runtime Node). */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(SESSION_COOKIE)?.value);
}
