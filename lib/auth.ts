/**
 * Site-wide password, shared by proxy.ts (which checks the session) and the
 * login page (which creates it). If PERISCOPE_PASSWORD isn't set, the site is open.
 */

export const SESSION_COOKIE = "periscope_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function sitePassword(): string | undefined {
  return process.env.PERISCOPE_PASSWORD || undefined;
}

/**
 * The session cookie's value: an HMAC of a fixed message, keyed by the password.
 * It can't be forged without the password, and changing the password logs everyone out.
 */
export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("periscope-session"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  const password = sitePassword();
  if (!password) return true;
  return !!value && value === (await sessionToken(password));
}

/** Where to go after logging in. Only same-site paths, so the link can't send people elsewhere. */
export function safeNextPath(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}
