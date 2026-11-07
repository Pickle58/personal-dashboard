import { createHash, timingSafeEqual } from "node:crypto";

export const DASHBOARD_COOKIE = "dashboard_access";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function secretsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  const equal = timingSafeEqual(providedDigest, expectedDigest);
  if (provided.length === 0 || expected.length === 0) return false;
  return equal;
}

export function dashboardCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}
