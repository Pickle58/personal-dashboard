import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { DASHBOARD_COOKIE, secretsMatch } from "@/lib/dashboard-auth";

export async function unauthorizedResponse(): Promise<NextResponse | null> {
  const jar = await cookies();
  const provided = jar.get(DASHBOARD_COOKIE)?.value ?? "";
  const expected = process.env.DASHBOARD_SECRET ?? "";
  if (!secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
