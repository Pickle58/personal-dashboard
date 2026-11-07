import { NextResponse } from "next/server";

import { deleteNote, patchNote } from "@/lib/db";
import { readJson, unauthorizedResponse } from "@/lib/http";
import { isNoteColor, NOTE_BODY_MAX, NOTE_TITLE_MAX } from "@/lib/notes";
import type { NoteColor } from "@/lib/types";

type NoteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: NoteContext) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const record = body as { title?: unknown; body?: unknown; color?: unknown };
  const patch: { title?: string; body?: string; color?: NoteColor } = {};

  if ("title" in record) {
    if (typeof record.title !== "string") {
      return NextResponse.json({ error: "Enter a title." }, { status: 400 });
    }
    if (record.title.length > NOTE_TITLE_MAX) {
      return NextResponse.json(
        { error: "Keep the title to 200 characters." },
        { status: 400 }
      );
    }
    patch.title = record.title;
  }
  if ("body" in record) {
    if (typeof record.body !== "string") {
      return NextResponse.json({ error: "Enter a note." }, { status: 400 });
    }
    if (record.body.length > NOTE_BODY_MAX) {
      return NextResponse.json(
        { error: "Keep the note to 20,000 characters." },
        { status: 400 }
      );
    }
    patch.body = record.body;
  }
  if ("color" in record) {
    if (!isNoteColor(record.color)) {
      return NextResponse.json(
        { error: "Pick a valid color." },
        { status: 400 }
      );
    }
    patch.color = record.color;
  }
  if (patch.title === undefined && patch.body === undefined && patch.color === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const note = await patchNote((await context.params).id, patch);
    if (!note) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(note);
  } catch {
    return NextResponse.json(
      { error: "This note was not saved." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: NoteContext) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  try {
    const removed = await deleteNote((await context.params).id);
    if (!removed) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "This note was not saved." },
      { status: 500 }
    );
  }
}
