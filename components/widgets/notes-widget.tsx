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
