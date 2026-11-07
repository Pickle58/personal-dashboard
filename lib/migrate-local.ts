import {
  localKeysAfterImport,
  selectLocalImport,
  storageKeyFor,
  type ImportCollection,
} from "@/lib/import-plan";
import { LOCATION_STORAGE_KEY } from "@/lib/location";
import { NOTES_STORAGE_KEY } from "@/lib/notes";
import { TODOS_STORAGE_KEY } from "@/lib/todos";

let pending: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!pending) {
    pending = migrate().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

async function migrate(): Promise<void> {
  const selected = selectLocalImport({
    todosRaw: window.localStorage.getItem(TODOS_STORAGE_KEY),
    notesRaw: window.localStorage.getItem(NOTES_STORAGE_KEY),
    locationRaw: window.localStorage.getItem(LOCATION_STORAGE_KEY),
  });

  for (const key of selected.dropKeys) {
    window.localStorage.removeItem(storageKeyFor(key));
  }

  const sent: ImportCollection[] = [];
  if (selected.body.todos) sent.push("todos");
  if (selected.body.notes) sent.push("notes");
  if (selected.body.location) sent.push("location");
  if (sent.length === 0) return;

  let response: Response;
  try {
    response = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(selected.body),
    });
  } catch {
    throw new Error("Couldn't load. Try again.");
  }

  if (!response.ok) {
    throw new Error("Couldn't load. Try again.");
  }

  for (const key of localKeysAfterImport({ httpOk: true, sent })) {
    window.localStorage.removeItem(storageKeyFor(key));
  }
}
