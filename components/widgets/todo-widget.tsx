"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureMigrated } from "@/lib/migrate-local";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  setTodoCompleted,
  validateTodoText,
} from "@/lib/todos";
import type { TodoItem } from "@/lib/types";

export function TodoWidget() {
  const [todos, setTodos] = useState<TodoItem[] | null>(null);
  const [text, setText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const todosRef = useRef<TodoItem[] | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const idAlias = useRef(new Map<string, string>());

  function setTodosSync(next: TodoItem[] | null) {
    todosRef.current = next;
    setTodos(next);
  }

  function resolveId(id: string) {
    return idAlias.current.get(id) ?? id;
  }

  async function load() {
    setLoadError(null);
    setTodosSync(null);
    try {
      await ensureMigrated();
    } catch {
      setLoadError("Couldn't load. Try again.");
      return;
    }
    const result = await fetchTodos();
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    setTodosSync(result.todos);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureMigrated();
      } catch {
        if (!cancelled) setLoadError("Couldn't load. Try again.");
        return;
      }
      if (cancelled) return;
      const result = await fetchTodos();
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setTodosSync(result.todos);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function enqueue(task: () => Promise<void>) {
    queueRef.current = queueRef.current.then(task, task);
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const parsed = validateTodoText(text);
    if (!parsed.ok) {
      if (text.trim().length > 500) setSaveError(parsed.error);
      return;
    }
    if (todosRef.current === null) return;
    const draft = parsed.text;
    setText("");
    setSaveError(null);
    const tempId = crypto.randomUUID();

    enqueue(async () => {
      const previous = todosRef.current ?? [];
      setTodosSync([
        { id: tempId, text: draft, completed: false },
        ...previous,
      ]);
      const result = await createTodo(draft);
      if (!result.ok) {
        setTodosSync(previous);
        setSaveError("Couldn't save that change.");
        return;
      }
      idAlias.current.set(tempId, result.todo.id);
      setTodosSync(
        (todosRef.current ?? []).map((todo) =>
          todo.id === tempId ? result.todo : todo
        )
      );
    });
  }

  function toggleTodo(id: string) {
    if (todosRef.current === null) return;
    enqueue(async () => {
      const previous = todosRef.current ?? [];
      const serverId = resolveId(id);
      const current = previous.find((todo) => todo.id === serverId || todo.id === id);
      if (!current) return;
      const completed = !current.completed;
      setTodosSync(
        previous.map((todo) =>
          todo.id === current.id ? { ...todo, completed } : todo
        )
      );
      const result = await setTodoCompleted(serverId, completed);
      if (result.ok) return;
      if (result.status === 404) {
        setTodosSync(previous.filter((todo) => todo.id !== current.id));
        return;
      }
      setTodosSync(previous);
      setSaveError("Couldn't save that change.");
    });
  }

  function removeTodo(id: string) {
    if (todosRef.current === null) return;
    enqueue(async () => {
      const previous = todosRef.current ?? [];
      const serverId = resolveId(id);
      const current = previous.find((todo) => todo.id === serverId || todo.id === id);
      if (!current) return;
      setTodosSync(previous.filter((todo) => todo.id !== current.id));
      const result = await deleteTodo(serverId);
      if (result.ok || result.status === 404) return;
      setTodosSync(previous);
      setSaveError("Couldn't save that change.");
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="size-4 text-primary" />
          To-Do
        </CardTitle>
        <CardDescription>Tasks saved to your dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a task…"
            aria-label="New task"
          />
          <Button type="submit" size="icon" aria-label="Add task">
            <Plus className="size-4" />
          </Button>
        </form>

        {saveError ? (
          <p className="text-sm text-destructive">{saveError}</p>
        ) : null}

        {todos === null && !loadError ? (
          <Skeleton className="h-20 w-full" />
        ) : loadError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : todos && todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Add one above.
          </p>
        ) : (
          <ScrollArea className="h-56 pr-3">
            <ul className="space-y-2">
              {todos?.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="data-checked:border-highlight data-checked:bg-highlight data-checked:text-highlight-foreground"
                    aria-label={`Mark "${todo.text}" as ${todo.completed ? "incomplete" : "complete"}`}
                  />
                  <span
                    className={
                      todo.completed
                        ? "flex-1 text-sm text-muted-foreground line-through"
                        : "flex-1 text-sm text-foreground"
                    }
                  >
                    {todo.text}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeTodo(todo.id)}
                    aria-label={`Delete "${todo.text}"`}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
