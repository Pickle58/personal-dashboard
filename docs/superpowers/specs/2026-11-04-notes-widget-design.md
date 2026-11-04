# Notes Widget Design

Date: 2026-11-04  
Project: personal-dashboard  
Status: Approved for planning

## Goal

Add a **Notes** scratchpad widget: multiple named notes, stored locally, shown as an expandable stack, each with a pickable accent color.

## Approach

Mirror the existing To-Do pattern (client widget + `localStorage` helpers). No shared storage abstraction, no markdown, no sync.

## Data model

```ts
type NoteColor = "slate" | "sky" | "amber" | "emerald" | "rose";

type Note = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  updatedAt: number; // Date.now() on create/edit
};
```

### Color choices (fixed set of 5)

| Id | Role | Accent feel |
| --- | --- | --- |
| `slate` | Default / neutral | Cool gray |
| `sky` | Aligns with dashboard primary blue | Soft blue |
| `amber` | Aligns with dashboard highlight orange | Warm amber |
| `emerald` | Distinct calm accent | Green |
| `rose` | Distinct attention accent | Pink-red |

- Storage key: `personal-dashboard:notes`
- Module: `lib/notes.ts` with `loadNotes()` / `saveNotes(notes)`
- Load validates shape (including `color` ∈ the five ids); invalid or missing data returns `[]`
- Missing/invalid `color` on an otherwise valid note falls back to `"slate"` (forward-compatible if older drafts appear)
- Persist on every React state update after hydration (same as todos)

## UI / behavior

- New client component: `components/widgets/notes-widget.tsx`
- Card chrome matches To-Do (icon + title + short description)
- Vertical stack of notes; each row shows the title when collapsed (blank title displays as “Untitled”)
- Collapsed/expanded row uses the note’s color as a left border (and light background tint) so color is visible without expanding
- Click title row (or chevron) to expand/collapse
- **Only one note expanded at a time**
- Expanded: title `Input` + body `textarea` + **color picker** (five swatch buttons; selected swatch indicated; `aria-label` per color)
- Changing color updates `color` and `updatedAt`
- **Add note**: creates `{ id: crypto.randomUUID(), title: "Untitled", body: "", color: "slate", updatedAt: Date.now() }`, prepends to list, expands it
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
- Custom/hex colors beyond the five
- Cloud sync or multi-device
- Export / import
- Refactoring todos into a shared “local items” helper

## Testing (manual)

1. Add a note → appears expanded with title “Untitled” and color `slate`
2. Edit title and body → reload page → values persist
3. Pick each of the five colors → swatch selection and row accent update; reload → color persists
4. Expand a second note → first collapses
5. Delete a note → removed and stays gone after reload
6. Empty list shows empty-state copy; first paint shows skeleton briefly

## Files to add/touch

| Path | Change |
| --- | --- |
| `lib/types.ts` | Add `NoteColor` and `Note` types |
| `lib/notes.ts` | New load/save helpers + color validation |
| `components/widgets/notes-widget.tsx` | New widget (stack, editor, color swatches) |
| `app/page.tsx` | Render `NotesWidget` |
| `README.md` | Document Notes widget |
