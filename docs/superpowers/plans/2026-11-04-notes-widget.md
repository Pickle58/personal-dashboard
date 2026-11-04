# Notes Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localStorage-backed Notes widget with an expandable note stack and five fixed accent colors.

**Architecture:** Mirror the To-Do widget: pure parse/normalize helpers in `lib/notes.ts`, a client `NotesWidget` that hydrates/saves like `TodoWidget`, and register it as a fifth card on the home grid. No server routes or new dependencies beyond Vitest for unit tests.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4 + existing shadcn/ui primitives, `localStorage`, Vitest for `lib/notes` unit tests.

## Global Constraints

- Storage key must be exactly `personal-dashboard:notes`
- Colors must be exactly: `slate` | `sky` | `amber` | `emerald` | `rose`
- New notes default to `color: "slate"` and `title: "Untitled"`
- Only one note expanded at a time
- No markdown, sync, custom hex colors, or todos-storage refactor
- Match existing widget Card / ScrollArea / Skeleton patterns in `components/widgets/todo-widget.tsx`
- Keep Weather, Calendar, To-Do, and News widgets unchanged

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/types.ts` | Add `NoteColor` and `Note` types |
| `lib/notes.ts` | Storage key, color list, normalize/parse, load/save |
| `lib/notes.test.ts` | Unit tests for normalize/parse/color fallback |
| `vitest.config.ts` | Vitest config with `@/` alias |
| `package.json` | Add `test` script + vitest devDependency |
| `components/widgets/notes-widget.tsx` | UI: stack, expand, edit, color swatches |
| `app/page.tsx` | Render `NotesWidget` |
| `README.md` | Document Notes widget |

---

### Task 1: Note types + pure parse helpers (TDD)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/notes.test.ts`
- Modify: `lib/types.ts`
- Create: `lib/notes.ts`

**Interfaces:**
- Consumes: none (foundation task)
- Produces:
  - `type NoteColor = "slate" | "sky" | "amber" | "emerald" | "rose"`
  - `type Note = { id: string; title: string; body: string; color: NoteColor; updatedAt: number }`
  - `export const NOTES_STORAGE_KEY = "personal-dashboard:notes"`
  - `export const NOTE_COLORS: readonly NoteColor[]`
  - `export function isNoteColor(value: unknown): value is NoteColor`
  - `export function normalizeNote(value: unknown): Note | null`
  - `export function parseNotes(raw: string | null): Note[]`

- [ ] **Step 1: Add Vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `lib/notes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  NOTE_COLORS,
  normalizeNote,
  parseNotes,
} from "@/lib/notes";

describe("NOTE_COLORS", () => {
  it("has exactly the five approved colors", () => {
    expect([...NOTE_COLORS]).toEqual([
      "slate",
      "sky",
      "amber",
      "emerald",
      "rose",
    ]);
  });
});

describe("normalizeNote", () => {
  it("returns a Note when all fields are valid", () => {
    expect(
      normalizeNote({
        id: "a",
        title: "Hello",
        body: "World",
        color: "sky",
        updatedAt: 100,
      })
    ).toEqual({
      id: "a",
      title: "Hello",
      body: "World",
      color: "sky",
      updatedAt: 100,
    });
  });

  it("falls back to slate when color is missing or invalid", () => {
    expect(
      normalizeNote({
        id: "a",
        title: "Hello",
        body: "",
        updatedAt: 1,
      })?.color
    ).toBe("slate");

    expect(
      normalizeNote({
        id: "a",
        title: "Hello",
        body: "",
        color: "purple",
        updatedAt: 1,
      })?.color
    ).toBe("slate");
  });

  it("returns null when required fields are missing", () => {
    expect(normalizeNote({ title: "x", body: "", updatedAt: 1 })).toBeNull();
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote("nope")).toBeNull();
  });
});

describe("parseNotes", () => {
  it("returns [] for null, invalid JSON, or non-arrays", () => {
    expect(parseNotes(null)).toEqual([]);
    expect(parseNotes("{")).toEqual([]);
    expect(parseNotes('"x"')).toEqual([]);
  });

  it("keeps only normalized notes from an array", () => {
    const raw = JSON.stringify([
      {
        id: "1",
        title: "Keep",
        body: "yes",
        color: "rose",
        updatedAt: 9,
      },
      { id: "bad" },
    ]);
    expect(parseNotes(raw)).toEqual([
      {
        id: "1",
        title: "Keep",
        body: "yes",
        color: "rose",
        updatedAt: 9,
      },
    ]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL — cannot resolve `@/lib/notes` / module not found.

- [ ] **Step 4: Add types**

Append to `lib/types.ts`:

```ts
export type NoteColor = "slate" | "sky" | "amber" | "emerald" | "rose";

export type Note = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  updatedAt: number;
};
```

- [ ] **Step 5: Implement `lib/notes.ts` (parse helpers only; load/save in Task 2)**

Create `lib/notes.ts`:

```ts
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`

Expected: PASS (all tests green).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/types.ts lib/notes.ts lib/notes.test.ts
git commit -m "Add note types and tested parse helpers for notes storage."
```

---

### Task 2: loadNotes / saveNotes

**Files:**
- Modify: `lib/notes.ts`
- Modify: `lib/notes.test.ts`

**Interfaces:**
- Consumes: `parseNotes`, `NOTES_STORAGE_KEY`, `Note` from Task 1
- Produces:
  - `export function loadNotes(): Note[]`
  - `export function saveNotes(notes: Note[]): void`

- [ ] **Step 1: Replace `lib/notes.test.ts` with the full suite including load/save**

Overwrite `lib/notes.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  NOTE_COLORS,
  NOTES_STORAGE_KEY,
  loadNotes,
  normalizeNote,
  parseNotes,
  saveNotes,
} from "@/lib/notes";

describe("NOTE_COLORS", () => {
  it("has exactly the five approved colors", () => {
    expect([...NOTE_COLORS]).toEqual([
      "slate",
      "sky",
      "amber",
      "emerald",
      "rose",
    ]);
  });
});

describe("normalizeNote", () => {
  it("returns a Note when all fields are valid", () => {
    expect(
      normalizeNote({
        id: "a",
        title: "Hello",
        body: "World",
        color: "sky",
        updatedAt: 100,
      })
    ).toEqual({
      id: "a",
      title: "Hello",
      body: "World",
      color: "sky",
      updatedAt: 100,
    });
  });

  it("falls back to slate when color is missing or invalid", () => {
    expect(
      normalizeNote({
        id: "a",
        title: "Hello",
        body: "",
        updatedAt: 1,
      })?.color
    ).toBe("slate");

    expect(
      normalizeNote({
        id: "a",
        title: "Hello",
        body: "",
        color: "purple",
        updatedAt: 1,
      })?.color
    ).toBe("slate");
  });

  it("returns null when required fields are missing", () => {
    expect(normalizeNote({ title: "x", body: "", updatedAt: 1 })).toBeNull();
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote("nope")).toBeNull();
  });
});

describe("parseNotes", () => {
  it("returns [] for null, invalid JSON, or non-arrays", () => {
    expect(parseNotes(null)).toEqual([]);
    expect(parseNotes("{")).toEqual([]);
    expect(parseNotes('"x"')).toEqual([]);
  });

  it("keeps only normalized notes from an array", () => {
    const raw = JSON.stringify([
      {
        id: "1",
        title: "Keep",
        body: "yes",
        color: "rose",
        updatedAt: 9,
      },
      { id: "bad" },
    ]);
    expect(parseNotes(raw)).toEqual([
      {
        id: "1",
        title: "Keep",
        body: "yes",
        color: "rose",
        updatedAt: 9,
      },
    ]);
  });
});

describe("loadNotes / saveNotes", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  it("round-trips notes through localStorage", () => {
    const notes = [
      {
        id: "1",
        title: "A",
        body: "B",
        color: "amber" as const,
        updatedAt: 42,
      },
    ];
    saveNotes(notes);
    expect(store.get(NOTES_STORAGE_KEY)).toBe(JSON.stringify(notes));
    expect(loadNotes()).toEqual(notes);
  });

  it("loadNotes returns [] when empty", () => {
    expect(loadNotes()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify new cases fail**

Run: `npm test`

Expected: FAIL — `loadNotes` / `saveNotes` not exported.

- [ ] **Step 3: Implement load/save**

Append to `lib/notes.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/notes.ts lib/notes.test.ts
git commit -m "Add localStorage load and save for notes."
```

---

### Task 3: NotesWidget UI

**Files:**
- Create: `components/widgets/notes-widget.tsx`

**Interfaces:**
- Consumes: `loadNotes`, `saveNotes`, `NOTE_COLORS` from `@/lib/notes`; `Note`, `NoteColor` from `@/lib/types`
- Produces: `export function NotesWidget(): JSX.Element`

- [ ] **Step 1: Create the widget**

Create `components/widgets/notes-widget.tsx` with this full implementation:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, NotebookPen, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTE_COLORS, loadNotes, saveNotes } from "@/lib/notes";
import type { Note, NoteColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR_STYLES: Record<
  NoteColor,
  { row: string; swatch: string; label: string }
> = {
  slate: {
    row: "border-l-slate-400 bg-slate-50 dark:bg-slate-950/40",
    swatch: "bg-slate-400",
    label: "Slate",
  },
  sky: {
    row: "border-l-sky-500 bg-sky-50 dark:bg-sky-950/40",
    swatch: "bg-sky-500",
    label: "Sky",
  },
  amber: {
    row: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/40",
    swatch: "bg-amber-500",
    label: "Amber",
  },
  emerald: {
    row: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    swatch: "bg-emerald-500",
    label: "Emerald",
  },
  rose: {
    row: "border-l-rose-500 bg-rose-50 dark:bg-rose-950/40",
    swatch: "bg-rose-500",
    label: "Rose",
  },
};

function displayTitle(title: string): string {
  return title.trim() ? title : "Untitled";
}

export function NotesWidget() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  useEffect(() => {
    if (notes === null) return;
    saveNotes(notes);
  }, [notes]);

  function addNote() {
    if (notes === null) return;
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      body: "",
      color: "slate",
      updatedAt: Date.now(),
    };
    setNotes([note, ...notes]);
    setExpandedId(note.id);
  }

  function updateNote(id: string, patch: Partial<Pick<Note, "title" | "body" | "color">>) {
    if (notes === null) return;
    setNotes(
      notes.map((note) =>
        note.id === id
          ? { ...note, ...patch, updatedAt: Date.now() }
          : note
      )
    );
  }

  function deleteNote(id: string) {
    if (notes === null) return;
    setNotes(notes.filter((note) => note.id !== id));
    setExpandedId((current) => (current === id ? null : current));
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="size-4 text-primary" />
              Notes
            </CardTitle>
            <CardDescription>Scratchpad saved in this browser</CardDescription>
          </div>
          <Button
            type="button"
            size="icon"
            onClick={addNote}
            aria-label="Add note"
            disabled={notes === null}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notes === null ? (
          <Skeleton className="h-20 w-full" />
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes yet. Add one to start a scratchpad.
          </p>
        ) : (
          <ScrollArea className="h-72 pr-3">
            <ul className="space-y-2">
              {notes.map((note) => {
                const expanded = expandedId === note.id;
                const styles = COLOR_STYLES[note.color];
                return (
                  <li
                    key={note.id}
                    className={cn(
                      "rounded-lg border border-border border-l-4",
                      styles.row
                    )}
                  >
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => toggleExpanded(note.id)}
                        aria-expanded={expanded}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            expanded ? "rotate-0" : "-rotate-90"
                          )}
                        />
                        <span className="truncate text-sm font-medium">
                          {displayTitle(note.title)}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteNote(note.id)}
                        aria-label={`Delete "${displayTitle(note.title)}"`}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    {expanded ? (
                      <div className="space-y-2 border-t border-border/60 px-2.5 py-2">
                        <Input
                          value={note.title}
                          onChange={(e) =>
                            updateNote(note.id, { title: e.target.value })
                          }
                          aria-label="Note title"
                          placeholder="Untitled"
                        />
                        <textarea
                          value={note.body}
                          onChange={(e) =>
                            updateNote(note.id, { body: e.target.value })
                          }
                          aria-label="Note body"
                          placeholder="Write a note…"
                          rows={4}
                          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                        <div
                          className="flex items-center gap-2"
                          role="group"
                          aria-label="Note color"
                        >
                          {NOTE_COLORS.map((color) => {
                            const swatch = COLOR_STYLES[color];
                            const selected = note.color === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() =>
                                  updateNote(note.id, { color })
                                }
                                aria-label={swatch.label}
                                aria-pressed={selected}
                                className={cn(
                                  "size-6 rounded-full border border-border",
                                  swatch.swatch,
                                  selected &&
                                    "ring-2 ring-ring ring-offset-2 ring-offset-background"
                                )}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck the widget**

Run: `npx tsc --noEmit`

Expected: no errors related to `notes-widget.tsx` (project may already be clean).

- [ ] **Step 3: Commit**

```bash
git add components/widgets/notes-widget.tsx
git commit -m "Add expandable Notes widget with five accent colors."
```

---

### Task 4: Wire into page + README + manual verification

**Files:**
- Modify: `app/page.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `NotesWidget` from Task 3
- Produces: Notes card visible on `/`

- [ ] **Step 1: Register the widget**

Replace `app/page.tsx` with:

```tsx
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { NewsWidget } from "@/components/widgets/news-widget";
import { NotesWidget } from "@/components/widgets/notes-widget";
import { TodoWidget } from "@/components/widgets/todo-widget";
import { WeatherWidget } from "@/components/widgets/weather-widget";

export default function Home() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <WeatherWidget />
      <CalendarWidget />
      <TodoWidget />
      <NewsWidget />
      <NotesWidget />
    </div>
  );
}
```

- [ ] **Step 2: Update README**

In `README.md`:

1. Change the opening sentence to mention notes.
2. In Stack, note that notes (like todos) use `localStorage`.
3. Add widget #5 under Widgets:

```markdown
5. **Notes** — expandable named scratchpad notes with five accent colors (`slate`, `sky`, `amber`, `emerald`, `rose`), persisted in `localStorage`
```

- [ ] **Step 3: Run unit tests and lint**

Run:

```bash
npm test
npm run lint
```

Expected: tests PASS; lint clean (or no new issues in touched files).

- [ ] **Step 4: Manual verification**

Run: `npm run dev` and open http://localhost:3000

Checklist (from spec):

1. Add a note → expanded, title “Untitled”, color slate
2. Edit title/body → reload → persists
3. Pick each of five colors → row accent updates; reload → color persists
4. Expand a second note → first collapses
5. Delete a note → gone after reload
6. Empty state after deleting all; skeleton flash on first load is acceptable

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx README.md
git commit -m "Show Notes widget on the dashboard and document it."
```

---

## Self-Review

**Spec coverage:**
- Data model + five colors → Task 1 types + `NOTE_COLORS`
- Color fallback to slate → Task 1 `normalizeNote` tests
- `loadNotes` / `saveNotes` + key → Task 2
- Expandable stack, one-at-a-time, add/delete, swatches, accents → Task 3
- Fifth grid item + README → Task 4
- Manual test list → Task 4 Step 4
- Out of scope items → not implemented (intentionally)

**Placeholders:** none

**Type consistency:** `Note` / `NoteColor` / `NOTE_COLORS` / `loadNotes` / `saveNotes` names match across tasks
