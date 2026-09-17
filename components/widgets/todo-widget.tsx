"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { loadTodos, saveTodos } from "@/lib/todos";
import type { TodoItem } from "@/lib/types";

export function TodoWidget() {
  // null = not hydrated from localStorage yet
  const [todos, setTodos] = useState<TodoItem[] | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    setTodos(loadTodos());
  }, []);

  useEffect(() => {
    if (todos === null) return;
    saveTodos(todos);
  }, [todos]);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || todos === null) return;

    setTodos([
      {
        id: crypto.randomUUID(),
        text: trimmed,
        completed: false,
      },
      ...todos,
    ]);
    setText("");
  }

  function toggleTodo(id: string) {
    if (todos === null) return;
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  function deleteTodo(id: string) {
    if (todos === null) return;
    setTodos(todos.filter((todo) => todo.id !== id));
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="size-4 text-primary" />
          To-Do
        </CardTitle>
        <CardDescription>Tasks saved in this browser</CardDescription>
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

        {todos === null ? (
          <Skeleton className="h-20 w-full" />
        ) : todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Add one above.
          </p>
        ) : (
          <ScrollArea className="h-56 pr-3">
            <ul className="space-y-2">
              {todos.map((todo) => (
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
                    onClick={() => deleteTodo(todo.id)}
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
