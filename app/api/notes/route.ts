import { NextResponse } from "next/server";

import { createNote, listNotes } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/http";

export async function GET() {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  try {
    return NextResponse.json(await listNotes());
  } catch {
    return NextResponse.json(
      { error: "Couldn't load. Try again." },
      { status: 500 }
    );
  }
}

export async function POST() {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  try {
    const note = await createNote();
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "This note was not saved." },
      { status: 500 }
    );
  }
}
