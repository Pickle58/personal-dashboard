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
