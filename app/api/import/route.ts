import { NextResponse } from "next/server";

import { importLocal } from "@/lib/db";
import { readJson, unauthorizedResponse } from "@/lib/http";
import type { ImportCollection } from "@/lib/import-plan";
import { validateLocation } from "@/lib/location";
import { validateImportNote } from "@/lib/notes";
import type { Note, SavedLocation, TodoItem } from "@/lib/types";
import { validateImportTodo } from "@/lib/todos";

export async function POST(request: Request) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const present: ImportCollection[] = [];
  let todos: TodoItem[] | undefined;
  let notes: Note[] | undefined;
  let location: SavedLocation | undefined;

  if ("todos" in record) {
    if (!Array.isArray(record.todos)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    present.push("todos");
    todos = record.todos
      .map((item) => validateImportTodo(item))
      .filter((item): item is TodoItem => item !== null);
  }

  if ("notes" in record) {
    if (!Array.isArray(record.notes)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    present.push("notes");
    notes = record.notes
      .map((item) => validateImportNote(item))
      .filter((item): item is Note => item !== null);
  }

  if ("location" in record) {
    const parsed = validateLocation(record.location);
    if (!parsed) {
      return NextResponse.json(
        { error: "Enter a valid location." },
        { status: 400 }
      );
    }
    present.push("location");
    location = parsed;
  }

  try {
    const plan = await importLocal({ todos, notes, location, present });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "Couldn't load. Try again." },
      { status: 500 }
    );
  }
}
