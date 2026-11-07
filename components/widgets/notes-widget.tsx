"use client";

import { useEffect, useRef, useState } from "react";
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
import { ensureMigrated } from "@/lib/migrate-local";
import {
  NOTE_BODY_MAX,
  NOTE_COLORS,
  NOTE_TITLE_MAX,
  createNote,
  deleteNote,
  fetchNotes,
  patchNote,
} from "@/lib/notes";
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

type SaveState = {
  revision: number;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  dirty: boolean;
};

export function NotesWidget() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const notesRef = useRef<Note[] | null>(null);
  const saves = useRef(new Map<string, SaveState>());
  const idAlias = useRef(new Map<string, string>());

  function setNotesSync(next: Note[] | null) {
    notesRef.current = next;
    setNotes(next);
  }

  function saveState(id: string): SaveState {
    const existing = saves.current.get(id);
    if (existing) return existing;
    const created: SaveState = {
      revision: 0,
      timer: null,
      inFlight: false,
      dirty: false,
    };
    saves.current.set(id, created);
    return created;
  }

  function resolveId(id: string) {
    return idAlias.current.get(id) ?? id;
  }

  function limitError(note: Note): string | null {
    if (note.title.length > NOTE_TITLE_MAX) {
      return "Keep the title to 200 characters.";
    }
    if (note.body.length > NOTE_BODY_MAX) {
      return "Keep the note to 20,000 characters.";
    }
    return null;
  }

  async function sendSave(id: string, revision: number) {
    const state = saveState(id);
    const note = notesRef.current?.find((item) => item.id === id);
    if (!note) return;
    const blocked = limitError(note);
    if (blocked) {
      setSaveError(blocked);
      return;
    }
    if (idAlias.current.get(id) === undefined && id !== resolveId(id)) return;
    const serverId = resolveId(id);
    if (serverId === id && idAlias.current.has(id) === false && note.id.startsWith("temp:")) {
      state.dirty = true;
      return;
    }
    if (state.inFlight) {
      state.dirty = true;
      return;
    }
    state.inFlight = true;
    state.dirty = false;
    const result = await patchNote(serverId, {
      title: note.title,
      body: note.body,
      color: note.color,
    });
    state.inFlight = false;
    if (!result.ok) {
      if (result.status === 404) {
        setNotesSync((notesRef.current ?? []).filter((item) => item.id !== id));
        setExpandedId((current) => (current === id ? null : current));
        return;
      }
      setSaveError("This note was not saved.");
      return;
    }
    if (state.dirty || state.revision !== revision) {
      state.dirty = false;
      void sendSave(id, state.revision);
    }
  }

  function scheduleSave(id: string, immediate: boolean) {
    const state = saveState(id);
    state.revision += 1;
    const revision = state.revision;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    if (immediate) {
      void sendSave(id, revision);
      return;
    }
    state.timer = setTimeout(() => {
      state.timer = null;
      void sendSave(id, revision);
    }, 500);
  }

  function flush(id: string) {
    const state = saves.current.get(id);
    if (!state?.timer) return;
    clearTimeout(state.timer);
    state.timer = null;
    state.revision += 1;
    void sendSave(id, state.revision);
  }

  async function load() {
    setLoadError(null);
    setNotesSync(null);
    try {
      await ensureMigrated();
    } catch {
      setLoadError("Couldn't load. Try again.");
      return;
    }
    const result = await fetchNotes();
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    setNotesSync(result.notes);
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
      const result = await fetchNotes();
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setNotesSync(result.notes);
    })();
    const onHide = () => {
      for (const id of saves.current.keys()) flush(id);
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  async function addNote() {
    if (notesRef.current === null) return;
    const tempId = `temp:${crypto.randomUUID()}`;
    const draft: Note = {
      id: tempId,
      title: "Untitled",
      body: "",
      color: "slate",
      updatedAt: Date.now(),
    };
    setNotesSync([draft, ...notesRef.current]);
    setExpandedId(tempId);
    setSaveError(null);
    const result = await createNote();
    if (!result.ok) {
      setNotesSync((notesRef.current ?? []).filter((note) => note.id !== tempId));
      setExpandedId((current) => (current === tempId ? null : current));
      setSaveError("This note was not saved.");
      return;
    }
    idAlias.current.set(tempId, result.note.id);
    setNotesSync(
      (notesRef.current ?? []).map((note) =>
        note.id === tempId ? { ...result.note, title: note.title, body: note.body, color: note.color } : note
      )
    );
    setExpandedId((current) => (current === tempId ? result.note.id : current));
    const state = saves.current.get(tempId);
    if (state?.dirty || state?.timer) {
      if (state.timer) clearTimeout(state.timer);
      saves.current.set(result.note.id, state);
      saves.current.delete(tempId);
      void sendSave(result.note.id, state.revision);
    }
  }

  function updateNote(
    id: string,
    patch: Partial<Pick<Note, "title" | "body" | "color">>,
    immediate: boolean
  ) {
    if (notesRef.current === null) return;
    const next = notesRef.current.map((note) =>
      note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note
    );
    setNotesSync(next);
    const updated = next.find((note) => note.id === id);
    if (!updated) return;
    const blocked = limitError(updated);
    if (blocked) {
      setSaveError(blocked);
      const state = saveState(id);
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
      return;
    }
    setSaveError(null);
    scheduleSave(id, immediate);
  }

  async function removeNote(id: string) {
    if (notesRef.current === null) return;
    const previous = notesRef.current;
    const state = saves.current.get(id);
    if (state?.timer) clearTimeout(state.timer);
    setNotesSync(previous.filter((note) => note.id !== id));
    setExpandedId((current) => (current === id ? null : current));
    const serverId = resolveId(id);
    if (serverId.startsWith("temp:")) return;
    const result = await deleteNote(serverId);
    if (result.ok || result.status === 404) return;
    setNotesSync(previous);
    setSaveError("This note was not saved.");
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => {
      if (current === id) {
        flush(id);
        return null;
      }
      if (current) flush(current);
      return id;
    });
  }

  function retrySave() {
    const id = expandedId;
    if (!id) return;
    const state = saveState(id);
    state.revision += 1;
    void sendSave(id, state.revision);
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
            <CardDescription>Scratchpad saved to your dashboard</CardDescription>
          </div>
          <Button
            type="button"
            size="icon"
            onClick={() => void addNote()}
            aria-label="Add note"
            disabled={notes === null}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {saveError ? (
          <div className="mb-3 space-y-2">
            <p className="text-sm text-destructive">{saveError}</p>
            {saveError === "This note was not saved." ? (
              <Button type="button" variant="outline" size="sm" onClick={retrySave}>
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
        {notes === null && !loadError ? (
          <Skeleton className="h-20 w-full" />
        ) : loadError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : notes && notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes yet. Add one to start a scratchpad.
          </p>
        ) : (
          <ScrollArea className="h-72 pr-3">
            <ul className="space-y-2">
              {notes?.map((note) => {
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
                        onClick={() => void removeNote(note.id)}
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
                            updateNote(note.id, { title: e.target.value }, false)
                          }
                          onBlur={() => flush(note.id)}
                          aria-label="Note title"
                          placeholder="Untitled"
                        />
                        <textarea
                          value={note.body}
                          onChange={(e) =>
                            updateNote(note.id, { body: e.target.value }, false)
                          }
                          onBlur={() => flush(note.id)}
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
                                  updateNote(note.id, { color }, true)
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
