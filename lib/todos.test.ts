import { describe, expect, it } from "vitest";

import { validateImportTodo, validateTodoText } from "@/lib/todos";

describe("validateTodoText", () => {
  it("trims and accepts text up to 500 characters", () => {
    expect(validateTodoText("  Buy milk  ")).toEqual({
      ok: true,
      text: "Buy milk",
    });
    expect(validateTodoText("a".repeat(500))).toEqual({
      ok: true,
      text: "a".repeat(500),
    });
  });

  it("rejects empty and over-long text", () => {
    expect(validateTodoText("   ")).toEqual({
      ok: false,
      error: "Enter a task.",
    });
    expect(validateTodoText("a".repeat(501))).toEqual({
      ok: false,
      error: "Keep it to 500 characters.",
    });
    expect(validateTodoText(12).ok).toBe(false);
  });
});

describe("validateImportTodo", () => {
  it("keeps a valid item and drops an invalid one", () => {
    expect(
      validateImportTodo({ id: "1", text: " Ship ", completed: false })
    ).toEqual({ id: "1", text: "Ship", completed: false });
    expect(validateImportTodo({ id: "1", text: "   ", completed: false })).toBe(
      null
    );
    expect(
      validateImportTodo({ id: "1", text: "a".repeat(501), completed: true })
    ).toBe(null);
  });
});
