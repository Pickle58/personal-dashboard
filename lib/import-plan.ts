import { LOCATION_STORAGE_KEY, readStoredLocation } from "@/lib/location";
import { NOTES_STORAGE_KEY, validateImportNote } from "@/lib/notes";
import type { Note, SavedLocation, TodoItem } from "@/lib/types";
import { TODOS_STORAGE_KEY, validateImportTodo } from "@/lib/todos";

export const IMPORT_LOCK_KEY = 814201;

export type ImportCollection = "todos" | "notes" | "location";
export type ImportOutcome = "inserted" | "skipped";

export type ImportBody = {
  todos?: TodoItem[];
  notes?: Note[];
  location?: SavedLocation;
};

const STORAGE_KEYS: Record<ImportCollection, string> = {
  todos: TODOS_STORAGE_KEY,
  notes: NOTES_STORAGE_KEY,
  location: LOCATION_STORAGE_KEY,
};

export function storageKeyFor(collection: ImportCollection): string {
  return STORAGE_KEYS[collection];
}

export function planImport(input: {
  serverCounts: Record<ImportCollection, number>;
  present: readonly ImportCollection[];
}): Partial<Record<ImportCollection, ImportOutcome>> {
  const plan: Partial<Record<ImportCollection, ImportOutcome>> = {};
  for (const collection of input.present) {
    plan[collection] =
      input.serverCounts[collection] > 0 ? "skipped" : "inserted";
  }
  return plan;
}

export function createdAtForIndex(nowMs: number, index: number): number {
  return nowMs - index;
}

export function localKeysAfterImport(input: {
  httpOk: boolean;
  sent: readonly ImportCollection[];
}): ImportCollection[] {
  if (!input.httpOk) return [];
  return [...input.sent];
}

export function selectLocalImport(input: {
  todosRaw: string | null;
  notesRaw: string | null;
  locationRaw: string | null;
}): { body: ImportBody; dropKeys: ImportCollection[] } {
  const body: ImportBody = {};
  const dropKeys: ImportCollection[] = [];

  if (input.todosRaw !== null) {
    const todos = parseTodoArray(input.todosRaw);
    if (todos.length === 0) dropKeys.push("todos");
    else body.todos = todos;
  }

  if (input.notesRaw !== null) {
    const notes = parseNoteArray(input.notesRaw);
    if (notes.length === 0) dropKeys.push("notes");
    else body.notes = notes;
  }

  if (input.locationRaw !== null) {
    const location = readStoredLocation(input.locationRaw);
    if (!location) dropKeys.push("location");
    else body.location = location;
  }

  return { body, dropKeys };
}

function parseTodoArray(raw: string): TodoItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => validateImportTodo(item))
      .filter((item): item is TodoItem => item !== null);
  } catch {
    return [];
  }
}

function parseNoteArray(raw: string): Note[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => validateImportNote(item))
      .filter((item): item is Note => item !== null);
  } catch {
    return [];
  }
}
