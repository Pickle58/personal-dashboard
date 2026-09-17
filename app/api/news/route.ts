import { NextResponse } from "next/server";

import { fetchGuardianHeadlines } from "@/lib/news";

export async function GET() {
  try {
    const apiKey = process.env.GUARDIAN_API_KEY?.trim() || undefined;
    const articles = await fetchGuardianHeadlines(apiKey);
    return NextResponse.json({ articles });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
