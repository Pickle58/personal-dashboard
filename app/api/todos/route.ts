import { NextResponse } from "next/server";

import { createTodo, listTodos } from "@/lib/db";
import { readJson, unauthorizedResponse } from "@/lib/http";
import { validateTodoText } from "@/lib/todos";

export async function GET() {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  try {
    return NextResponse.json(await listTodos());
  } catch {
    return NextResponse.json(
      { error: "Couldn't load. Try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  const body = await readJson(request);
  const text = validateTodoText(
    body && typeof body === "object"
      ? (body as { text?: unknown }).text
      : undefined
  );
  if (!text.ok) {
    return NextResponse.json({ error: text.error }, { status: 400 });
  }

  try {
    const todo = await createTodo(text.text);
    return NextResponse.json(todo, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save that change." },
      { status: 500 }
    );
  }
}
