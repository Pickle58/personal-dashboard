# Notes Widget Design

Date: 2026-11-04  
Project: personal-dashboard  
Status: Approved for planning

## Goal

Add a **Notes** scratchpad widget: multiple named notes, stored locally, shown as an expandable stack.

## Approach

Mirror the existing To-Do pattern (client widget + `localStorage` helpers). No shared storage abstraction, no markdown, no sync.

## Data model

```ts
type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: number; // Date.now() on create/edit
};
```

- Storage key: `personal-dashboard:notes`
- Module: `lib/notes.ts` with `loadNotes()` / `saveNotes(notes)`
- Load validates shape; invalid or missing data returns `[]`
- Persist on every React state update after hydration (same as todos)

## UI / behavior

- New client component: `components/widgets/notes-widget.tsx`
- Card chrome matches To-Do (icon + title + short description)
- Vertical stack of notes; each row shows the title when collapsed (blank title displays as “Untitled”)
- Click title row (or chevron) to expand/collapse
- **Only one note expanded at a time**
- Expanded: title `Input` + body `textarea`
- **Add note**: creates `{ id: crypto.randomUUID(), title: "Untitled", body: "", updatedAt: Date.now() }`, prepends to list, expands it
- **Delete**: remove note; no confirm dialog (match todos)
- Editing title or body updates `updatedAt`
- Skeleton until hydrated from `localStorage`
- Empty state when there are no notes
- `ScrollArea` when the list is tall

## Layout

- Register `NotesWidget` in `app/page.tsx` as a fifth grid item
- Existing widgets unchanged (Weather, Calendar, To-Do, News)
- Grid remains `grid-cols-1` / `lg:grid-cols-2`; fifth card wraps naturally

## Out of scope

- Markdown / rich text
- Search, folders, tags, pinning
- Cloud sync or multi-device
- Export / import
- Refactoring todos into a shared “local items” helper

## Testing (manual)

1. Add a note → appears expanded with title “Untitled”
2. Edit title and body → reload page → values persist
3. Expand a second note → first collapses
4. Delete a note → removed and stays gone after reload
5. Empty list shows empty-state copy; first paint shows skeleton briefly

## Files to add/touch

| Path | Change |
| --- | --- |
| `lib/types.ts` | Add `Note` type |
| `lib/notes.ts` | New load/save helpers |
| `components/widgets/notes-widget.tsx` | New widget |
| `app/page.tsx` | Render `NotesWidget` |
| `README.md` | Document Notes widget |
