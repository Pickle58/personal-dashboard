import { describe, expect, it } from "vitest";

import {
  createdAtForIndex,
  localKeysAfterImport,
  planImport,
  selectLocalImport,
} from "@/lib/import-plan";

describe("planImport", () => {
  it("inserts only empty collections and skips the rest", () => {
    expect(
      planImport({
        serverCounts: { todos: 0, notes: 2, location: 0 },
        present: ["todos", "notes", "location"],
      })
    ).toEqual({ todos: "inserted", notes: "skipped", location: "inserted" });
  });

  it("omits collections that were not sent", () => {
    expect(
      planImport({
        serverCounts: { todos: 0, notes: 0, location: 1 },
        present: ["notes"],
      })
    ).toEqual({ notes: "inserted" });
  });
});

describe("createdAtForIndex", () => {
  it("keeps array order newest-first", () => {
    expect(createdAtForIndex(1_000, 0)).toBe(1_000);
    expect(createdAtForIndex(1_000, 1)).toBe(999);
    expect(createdAtForIndex(1_000, 2)).toBe(998);
  });
});

describe("localKeysAfterImport", () => {
  it("deletes sent keys only after a successful response", () => {
    expect(
      localKeysAfterImport({ httpOk: true, sent: ["todos", "notes"] })
    ).toEqual(["todos", "notes"]);
    expect(
      localKeysAfterImport({ httpOk: false, sent: ["todos", "notes"] })
    ).toEqual([]);
  });
});

describe("selectLocalImport", () => {
  it("keeps valid rows and ids, and drops empty or corrupt keys", () => {
    const notes = [
      {
        id: "n1",
        title: "Hello",
        body: "World",
        color: "rose",
        updatedAt: 5,
      },
    ];
    const selected = selectLocalImport({
      todosRaw: JSON.stringify([
        { id: "t1", text: "  Ship  ", completed: false },
        { id: "bad", text: "   ", completed: false },
      ]),
      notesRaw: JSON.stringify(notes),
      locationRaw: "{",
    });

    expect(selected.body.todos).toEqual([
      { id: "t1", text: "Ship", completed: false },
    ]);
    expect(selected.body.notes).toEqual(notes);
    expect(selected.body.location).toBeUndefined();
    expect(selected.dropKeys).toEqual(["location"]);
  });

  it("drops a present key that parses to nothing", () => {
    expect(
      selectLocalImport({
        todosRaw: "[]",
        notesRaw: null,
        locationRaw: null,
      })
    ).toEqual({ body: {}, dropKeys: ["todos"] });
  });
});
