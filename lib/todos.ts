import type { TodoItem } from "@/lib/types";

import { LOCATION_STORAGE_KEY } from "@/lib/location";

export const TODOS_STORAGE_KEY = "personal-dashboard:todos";
export { LOCATION_STORAGE_KEY };

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
  return validateImportTodo(value) !== null;
}

export function validateTodoText(
  value: unknown
): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Enter a task." };
  }
  const text = value.trim();
  if (!text) return { ok: false, error: "Enter a task." };
  if (text.length > 500) {
    return { ok: false, error: "Keep it to 500 characters." };
  }
  return { ok: true, text };
}

export function validateImportTodo(value: unknown): TodoItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id) return null;
  if (typeof item.completed !== "boolean") return null;
  const text = validateTodoText(item.text);
  if (!text.ok) return null;
  return { id: item.id, text: text.text, completed: item.completed };
}

export async function fetchTodos(): Promise<
  { ok: true; todos: TodoItem[] } | { ok: false; error: string }
> {
  try {
    const response = await fetch("/api/todos", { cache: "no-store" });
    if (!response.ok) return { ok: false, error: "Couldn't load. Try again." };
    const body = (await response.json()) as unknown;
    if (!Array.isArray(body)) return { ok: false, error: "Couldn't load. Try again." };
    return { ok: true, todos: body.filter(isTodoItem) };
  } catch {
    return { ok: false, error: "Couldn't load. Try again." };
  }
}

export async function createTodo(
  text: string
): Promise<{ ok: true; todo: TodoItem } | { ok: false; status: number }> {
  try {
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const todo = validateImportTodo(await response.json());
    if (!todo) return { ok: false, status: response.status };
    return { ok: true, todo };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function setTodoCompleted(
  id: string,
  completed: boolean
): Promise<{ ok: true; todo: TodoItem } | { ok: false; status: number }> {
  try {
    const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const todo = validateImportTodo(await response.json());
    if (!todo) return { ok: false, status: response.status };
    return { ok: true, todo };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function deleteTodo(
  id: string
): Promise<{ ok: true } | { ok: false; status: number }> {
  try {
    const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true };
  } catch {
    return { ok: false, status: 0 };
  }
}
