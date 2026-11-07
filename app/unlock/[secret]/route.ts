import { NextResponse } from "next/server";

import {
  DASHBOARD_COOKIE,
  dashboardCookieOptions,
  secretsMatch,
} from "@/lib/dashboard-auth";

type UnlockContext = {
  params: Promise<{ secret: string }>;
};

export async function GET(request: Request, context: UnlockContext) {
  const { secret } = await context.params;
  const expected = process.env.DASHBOARD_SECRET ?? "";
  const origin = new URL(request.url).origin;

  if (!secretsMatch(secret, expected)) {
    return NextResponse.redirect(new URL("/locked", origin));
  }

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set(DASHBOARD_COOKIE, expected, dashboardCookieOptions());
  return response;
}
