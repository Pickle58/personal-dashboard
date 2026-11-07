import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DASHBOARD_COOKIE, secretsMatch } from "@/lib/dashboard-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/locked" || pathname.startsWith("/unlock/")) {
    return NextResponse.next();
  }

  const provided = request.cookies.get(DASHBOARD_COOKIE)?.value ?? "";
  const expected = process.env.DASHBOARD_SECRET ?? "";
  if (secretsMatch(provided, expected)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/locked", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
