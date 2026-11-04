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
