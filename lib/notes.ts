import type { Note, NoteColor } from "@/lib/types";

export const NOTES_STORAGE_KEY = "personal-dashboard:notes";

export const NOTE_COLORS = [
  "slate",
  "sky",
  "amber",
  "emerald",
  "rose",
] as const satisfies readonly NoteColor[];

export function isNoteColor(value: unknown): value is NoteColor {
  return (
    typeof value === "string" &&
    (NOTE_COLORS as readonly string[]).includes(value)
  );
}

export function normalizeNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string") return null;
  if (typeof item.title !== "string") return null;
  if (typeof item.body !== "string") return null;
  if (typeof item.updatedAt !== "number" || Number.isNaN(item.updatedAt)) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    body: item.body,
    color: isNoteColor(item.color) ? item.color : "slate",
    updatedAt: item.updatedAt,
  };
}

export function parseNotes(raw: string | null): Note[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeNote(item))
      .filter((note): note is Note => note !== null);
  } catch {
    return [];
  }
}

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    return parseNotes(window.localStorage.getItem(NOTES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export const NOTE_TITLE_MAX = 200;
export const NOTE_BODY_MAX = 20_000;

export function validateNoteFields(input: {
  title: unknown;
  body: unknown;
  color: unknown;
}):
  | { ok: true; title: string; body: string; color: NoteColor }
  | { ok: false; error: string } {
  if (typeof input.title !== "string") {
    return { ok: false, error: "Enter a title." };
  }
  if (input.title.length > NOTE_TITLE_MAX) {
    return { ok: false, error: "Keep the title to 200 characters." };
  }
  if (typeof input.body !== "string") {
    return { ok: false, error: "Enter a note." };
  }
  if (input.body.length > NOTE_BODY_MAX) {
    return { ok: false, error: "Keep the note to 20,000 characters." };
  }
  if (!isNoteColor(input.color)) {
    return { ok: false, error: "Pick a valid color." };
  }
  return {
    ok: true,
    title: input.title,
    body: input.body,
    color: input.color,
  };
}

export function validateImportNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id) return null;
  if (typeof item.updatedAt !== "number" || Number.isNaN(item.updatedAt)) {
    return null;
  }
  const fields = validateNoteFields({
    title: item.title,
    body: item.body,
    color: item.color,
  });
  if (!fields.ok) return null;
  return {
    id: item.id,
    title: fields.title,
    body: fields.body,
    color: fields.color,
    updatedAt: item.updatedAt,
  };
}

export async function fetchNotes(): Promise<
  { ok: true; notes: Note[] } | { ok: false; error: string }
> {
  try {
    const response = await fetch("/api/notes", { cache: "no-store" });
    if (!response.ok) return { ok: false, error: "Couldn't load. Try again." };
    const body = (await response.json()) as unknown;
    if (!Array.isArray(body)) return { ok: false, error: "Couldn't load. Try again." };
    const notes = body
      .map((item) => validateImportNote(item))
      .filter((note): note is Note => note !== null);
    return { ok: true, notes };
  } catch {
    return { ok: false, error: "Couldn't load. Try again." };
  }
}

export async function createNote(): Promise<
  { ok: true; note: Note } | { ok: false; status: number }
> {
  try {
    const response = await fetch("/api/notes", { method: "POST" });
    if (!response.ok) return { ok: false, status: response.status };
    const note = validateImportNote(await response.json());
    if (!note) return { ok: false, status: response.status };
    return { ok: true, note };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function patchNote(
  id: string,
  patch: { title: string; body: string; color: NoteColor }
): Promise<{ ok: true; note: Note } | { ok: false; status: number }> {
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const note = validateImportNote(await response.json());
    if (!note) return { ok: false, status: response.status };
    return { ok: true, note };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function deleteNote(
  id: string
): Promise<{ ok: true } | { ok: false; status: number }> {
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true };
  } catch {
    return { ok: false, status: 0 };
  }
}
