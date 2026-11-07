import { Pool, type PoolClient } from "@neondatabase/serverless";

import {
  IMPORT_LOCK_KEY,
  createdAtForIndex,
  planImport,
  type ImportCollection,
  type ImportOutcome,
} from "@/lib/import-plan";
import type { Note, NoteColor, SavedLocation, TodoItem } from "@/lib/types";

let pool: Pool | undefined;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

function asMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }
  return Number.NaN;
}

type TodoRow = { id: string; text: string; completed: boolean };
type NoteRow = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  updated_at: Date | string | number;
};
type LocationRow = { lat: number; lon: number; label: string | null };

function toTodo(row: TodoRow): TodoItem {
  return { id: row.id, text: row.text, completed: row.completed };
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    color: row.color,
    updatedAt: asMillis(row.updated_at),
  };
}

function toLocation(row: LocationRow): SavedLocation {
  const location: SavedLocation = { lat: row.lat, lon: row.lon };
  if (row.label) location.label = row.label;
  return location;
}

export async function listTodos(): Promise<TodoItem[]> {
  const { rows } = await getPool().query<TodoRow>(
    "select id, text, completed from todos order by created_at desc"
  );
  return rows.map(toTodo);
}

export async function createTodo(text: string): Promise<TodoItem> {
  const { rows } = await getPool().query<TodoRow>(
    "insert into todos (id, text, completed, created_at) values ($1, $2, false, now()) returning id, text, completed",
    [crypto.randomUUID(), text]
  );
  return toTodo(rows[0]);
}

export async function setTodoCompleted(
  id: string,
  completed: boolean
): Promise<TodoItem | null> {
  const { rows } = await getPool().query<TodoRow>(
    "update todos set completed = $2 where id = $1 returning id, text, completed",
    [id, completed]
  );
  return rows[0] ? toTodo(rows[0]) : null;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const result = await getPool().query("delete from todos where id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listNotes(): Promise<Note[]> {
  const { rows } = await getPool().query<NoteRow>(
    "select id, title, body, color, updated_at from notes order by created_at desc"
  );
  return rows.map(toNote);
}

export async function createNote(): Promise<Note> {
  const { rows } = await getPool().query<NoteRow>(
    `insert into notes (id, title, body, color, created_at, updated_at)
     values ($1, 'Untitled', '', 'slate', now(), now())
     returning id, title, body, color, updated_at`,
    [crypto.randomUUID()]
  );
  return toNote(rows[0]);
}

export async function patchNote(
  id: string,
  patch: { title?: string; body?: string; color?: NoteColor }
): Promise<Note | null> {
  const current = await getPool().query<NoteRow>(
    "select id, title, body, color, updated_at from notes where id = $1",
    [id]
  );
  const row = current.rows[0];
  if (!row) return null;
  const { rows } = await getPool().query<NoteRow>(
    `update notes
     set title = $2, body = $3, color = $4, updated_at = now()
     where id = $1
     returning id, title, body, color, updated_at`,
    [
      id,
      patch.title ?? row.title,
      patch.body ?? row.body,
      patch.color ?? row.color,
    ]
  );
  return rows[0] ? toNote(rows[0]) : null;
}

export async function deleteNote(id: string): Promise<boolean> {
  const result = await getPool().query("delete from notes where id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getLocation(): Promise<SavedLocation | null> {
  const { rows } = await getPool().query<LocationRow>(
    "select lat, lon, label from weather_location where id = 1"
  );
  return rows[0] ? toLocation(rows[0]) : null;
}

export async function putLocation(location: SavedLocation): Promise<SavedLocation> {
  const { rows } = await getPool().query<LocationRow>(
    `insert into weather_location (id, lat, lon, label)
     values (1, $1, $2, $3)
     on conflict (id) do update
       set lat = excluded.lat, lon = excluded.lon, label = excluded.label
     returning lat, lon, label`,
    [location.lat, location.lon, location.label ?? null]
  );
  return toLocation(rows[0]);
}

async function countRows(client: PoolClient, table: "todos" | "notes" | "weather_location") {
  const query =
    table === "todos"
      ? "select count(*)::int as count from todos"
      : table === "notes"
        ? "select count(*)::int as count from notes"
        : "select count(*)::int as count from weather_location";
  const { rows } = await client.query<{ count: number }>(query);
  return rows[0]?.count ?? 0;
}

export async function importLocal(input: {
  todos?: TodoItem[];
  notes?: Note[];
  location?: SavedLocation;
  present: readonly ImportCollection[];
}): Promise<Partial<Record<ImportCollection, ImportOutcome>>> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("select pg_advisory_xact_lock($1::bigint)", [
      IMPORT_LOCK_KEY,
    ]);
    const serverCounts = {
      todos: await countRows(client, "todos"),
      notes: await countRows(client, "notes"),
      location: await countRows(client, "weather_location"),
    };
    const plan = planImport({ serverCounts, present: input.present });
    const now = Date.now();

    if (plan.todos === "inserted") {
      for (const [index, todo] of (input.todos ?? []).entries()) {
        await client.query(
          "insert into todos (id, text, completed, created_at) values ($1, $2, $3, $4)",
          [todo.id, todo.text, todo.completed, new Date(createdAtForIndex(now, index))]
        );
      }
    }

    if (plan.notes === "inserted") {
      for (const [index, note] of (input.notes ?? []).entries()) {
        await client.query(
          `insert into notes (id, title, body, color, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            note.id,
            note.title,
            note.body,
            note.color,
            new Date(createdAtForIndex(now, index)),
            new Date(note.updatedAt),
          ]
        );
      }
    }

    if (plan.location === "inserted" && input.location) {
      await client.query(
        "insert into weather_location (id, lat, lon, label) values (1, $1, $2, $3)",
        [input.location.lat, input.location.lon, input.location.label ?? null]
      );
    }

    await client.query("COMMIT");
    return plan;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
