import { NextResponse } from "next/server";

import { deleteTodo, setTodoCompleted } from "@/lib/db";
import { readJson, unauthorizedResponse } from "@/lib/http";

type TodoContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: TodoContext) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  const body = await readJson(request);
  const completed =
    body && typeof body === "object"
      ? (body as { completed?: unknown }).completed
      : undefined;
  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const todo = await setTodoCompleted((await context.params).id, completed);
    if (!todo) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json(
      { error: "Couldn't save that change." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: TodoContext) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;

  try {
    const removed = await deleteTodo((await context.params).id);
    if (!removed) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save that change." },
      { status: 500 }
    );
  }
}
