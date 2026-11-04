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
