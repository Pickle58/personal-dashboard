import { NextResponse } from "next/server";

import { getLocation, putLocation } from "@/lib/db";
import { readJson, unauthorizedResponse } from "@/lib/http";
import { validateLocation } from "@/lib/location";

export async function GET() {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  try {
    return NextResponse.json(await getLocation());
  } catch {
    return NextResponse.json(
      { error: "Couldn't load your saved place." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  const location = validateLocation(await readJson(request));
  if (!location) {
    return NextResponse.json(
      { error: "Enter a valid location." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await putLocation(location));
  } catch {
    return NextResponse.json(
      { error: "This place was not saved for your other device." },
      { status: 500 }
    );
  }
}
