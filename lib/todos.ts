import type { TodoItem } from "@/lib/types";

export const TODOS_STORAGE_KEY = "personal-dashboard:todos";
export const LOCATION_STORAGE_KEY = "personal-dashboard:location";

/** @deprecated Use LOCATION_STORAGE_KEY */
export const LOCATION_STORAGE_KEY_ALIAS = LOCATION_STORAGE_KEY;

export function loadTodos(): TodoItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TODOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTodoItem);
  } catch {
    return [];
  }
}

export function saveTodos(todos: TodoItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
}

function isTodoItem(value: unknown): value is TodoItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    typeof item.completed === "boolean"
  );
}
