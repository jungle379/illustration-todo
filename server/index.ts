import { serve } from "@hono/node-server";
import { and, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { client, db } from "./db.js";
import {
  events,
  illustrationDays,
  illustrationEntries,
  practiceDays,
  practices,
} from "./schema.js";

export const app = new Hono();

app.onError((error, c) => {
  console.error("API request failed", {
    method: c.req.method,
    path: c.req.path,
    error,
  });
  return c.json({ error: "Internal server error" }, 500);
});

app.use(
  "/api/*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://illustration-todo.vercel.app",
    ],
  }),
);

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function evenSplit(total: number, parts: number) {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

async function ensureSchema() {
  await client.execute(`PRAGMA foreign_keys = ON`);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS practices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      entry_type TEXT NOT NULL,
      date TEXT,
      week_start TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS practice_days (
      id TEXT PRIMARY KEY,
      practice_id TEXT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
      date TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      large_needed INTEGER NOT NULL DEFAULT 0,
      medium_needed INTEGER NOT NULL DEFAULT 0,
      small_needed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS illustration_entries (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
      entry_type TEXT NOT NULL,
      date TEXT,
      week_start TEXT,
      large INTEGER NOT NULL DEFAULT 0,
      medium INTEGER NOT NULL DEFAULT 0,
      small INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS illustration_days (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL REFERENCES illustration_entries(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      large INTEGER NOT NULL DEFAULT 0,
      medium INTEGER NOT NULL DEFAULT 0,
      small INTEGER NOT NULL DEFAULT 0
    )
  `);
}

type SizeCounts = { large: number; medium: number; small: number };

function addCounts(a: SizeCounts, b: SizeCounts): SizeCounts {
  return {
    large: a.large + b.large,
    medium: a.medium + b.medium,
    small: a.small + b.small,
  };
}

async function producedByEvent() {
  const entries = await db.select().from(illustrationEntries);
  const days = await db.select().from(illustrationDays);
  const byEntry = new Map<string, SizeCounts>();
  const empty = { large: 0, medium: 0, small: 0 };

  for (const day of days) {
    const prev = byEntry.get(day.entryId) ?? empty;
    byEntry.set(day.entryId, addCounts(prev, day));
  }

  const byEvent = new Map<string, SizeCounts>();
  for (const entry of entries) {
    if (!entry.eventId) continue;
    const counts =
      entry.entryType === "week"
        ? (byEntry.get(entry.id) ?? empty)
        : { large: entry.large, medium: entry.medium, small: entry.small };
    const prev = byEvent.get(entry.eventId) ?? empty;
    byEvent.set(entry.eventId, addCounts(prev, counts));
  }
  return byEvent;
}

async function withProgress() {
  const allEvents = await db.select().from(events);
  const produced = await producedByEvent();
  return allEvents.map((event) => {
    const done = produced.get(event.id) ?? { large: 0, medium: 0, small: 0 };
    return {
      ...event,
      produced: done,
      remaining: {
        large: Math.max(0, event.largeNeeded - done.large),
        medium: Math.max(0, event.mediumNeeded - done.medium),
        small: Math.max(0, event.smallNeeded - done.small),
      },
    };
  });
}

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/practices", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const rows = await db.select().from(practices);
  const days = await db.select().from(practiceDays);
  const daysByPractice = new Map<string, string[]>();
  for (const day of days) {
    const list = daysByPractice.get(day.practiceId) ?? [];
    list.push(day.date);
    daysByPractice.set(day.practiceId, list);
  }

  const items = rows
    .map((row) => ({
      ...row,
      dates: row.entryType === "week" ? (daysByPractice.get(row.id) ?? []) : row.date ? [row.date] : [],
    }))
    .filter((row) => {
      if (!from || !to) return true;
      return row.dates.some((d) => d >= from && d <= to);
    });

  return c.json(items);
});

app.post("/api/practices", async (c) => {
  const body = await c.req.json<{
    title: string;
    notes?: string;
    entryType: "day" | "week";
    date?: string;
    weekStart?: string;
    dates?: string[];
  }>();

  const practiceId = id();
  await db.insert(practices).values({
    id: practiceId,
    title: body.title.trim(),
    notes: body.notes?.trim() ?? "",
    entryType: body.entryType,
    date: body.entryType === "day" ? body.date ?? null : null,
    weekStart: body.entryType === "week" ? body.weekStart ?? null : null,
    done: false,
    createdAt: now(),
  });

  const dates =
    body.entryType === "week"
      ? (body.dates?.length ? body.dates : weekDates(body.weekStart!))
      : [];

  if (dates.length) {
    await db.insert(practiceDays).values(
      dates.map((date) => ({
        id: id(),
        practiceId,
        date,
      })),
    );
  }

  return c.json({ id: practiceId }, 201);
});

app.patch("/api/practices/:id", async (c) => {
  const practiceId = c.req.param("id");
  const body = await c.req.json<{
    title?: string;
    notes?: string;
    done?: boolean;
    dates?: string[];
  }>();

  await db
    .update(practices)
    .set({
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}),
      ...(body.done !== undefined ? { done: body.done } : {}),
    })
    .where(eq(practices.id, practiceId));

  if (body.dates) {
    await db.delete(practiceDays).where(eq(practiceDays.practiceId, practiceId));
    if (body.dates.length) {
      await db.insert(practiceDays).values(
        body.dates.map((date) => ({
          id: id(),
          practiceId,
          date,
        })),
      );
    }
  }

  return c.json({ ok: true });
});

app.delete("/api/practices/:id", async (c) => {
  await db.delete(practices).where(eq(practices.id, c.req.param("id")));
  return c.json({ ok: true });
});

app.get("/api/events", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const items = await withProgress();
  const filtered = items.filter((event) => {
    if (!from || !to) return true;
    return event.date >= from && event.date <= to;
  });
  return c.json(filtered);
});

app.post("/api/events", async (c) => {
  const body = await c.req.json<{
    title: string;
    date: string;
    notes?: string;
    largeNeeded?: number;
    mediumNeeded?: number;
    smallNeeded?: number;
  }>();
  const eventId = id();
  await db.insert(events).values({
    id: eventId,
    title: body.title.trim(),
    date: body.date,
    notes: body.notes?.trim() ?? "",
    largeNeeded: body.largeNeeded ?? 0,
    mediumNeeded: body.mediumNeeded ?? 0,
    smallNeeded: body.smallNeeded ?? 0,
    createdAt: now(),
  });
  return c.json({ id: eventId }, 201);
});

app.patch("/api/events/:id", async (c) => {
  const body = await c.req.json<{
    title?: string;
    date?: string;
    notes?: string;
    largeNeeded?: number;
    mediumNeeded?: number;
    smallNeeded?: number;
  }>();
  await db
    .update(events)
    .set({
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.date !== undefined ? { date: body.date } : {}),
      ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}),
      ...(body.largeNeeded !== undefined ? { largeNeeded: body.largeNeeded } : {}),
      ...(body.mediumNeeded !== undefined ? { mediumNeeded: body.mediumNeeded } : {}),
      ...(body.smallNeeded !== undefined ? { smallNeeded: body.smallNeeded } : {}),
    })
    .where(eq(events.id, c.req.param("id")));
  return c.json({ ok: true });
});

app.delete("/api/events/:id", async (c) => {
  await db.delete(events).where(eq(events.id, c.req.param("id")));
  return c.json({ ok: true });
});

app.get("/api/illustrations", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const rows = await db.select().from(illustrationEntries);
  const days = await db.select().from(illustrationDays);
  const daysByEntry = new Map<string, typeof days>();
  for (const day of days) {
    const list = daysByEntry.get(day.entryId) ?? [];
    list.push(day);
    daysByEntry.set(day.entryId, list);
  }

  const items = rows
    .map((row) => ({
      ...row,
      days: daysByEntry.get(row.id) ?? [],
    }))
    .filter((row) => {
      if (!from || !to) return true;
      if (row.entryType === "day") {
        return Boolean(row.date && row.date >= from && row.date <= to);
      }
      return row.days.some((d) => d.date >= from && d.date <= to);
    });

  return c.json(items);
});

app.post("/api/illustrations", async (c) => {
  const body = await c.req.json<{
    eventId?: string | null;
    entryType: "day" | "week";
    date?: string;
    weekStart?: string;
    large?: number;
    medium?: number;
    small?: number;
    days?: { date: string; large: number; medium: number; small: number }[];
    distributeEvenly?: boolean;
  }>();

  const entryId = id();
  const large = body.large ?? 0;
  const medium = body.medium ?? 0;
  const small = body.small ?? 0;

  await db.insert(illustrationEntries).values({
    id: entryId,
    eventId: body.eventId ?? null,
    entryType: body.entryType,
    date: body.entryType === "day" ? body.date ?? null : null,
    weekStart: body.entryType === "week" ? body.weekStart ?? null : null,
    large,
    medium,
    small,
    createdAt: now(),
  });

  if (body.entryType === "week" && body.weekStart) {
    const dates = weekDates(body.weekStart);
    let allocations = body.days;
    if (!allocations?.length || body.distributeEvenly) {
      const largeParts = evenSplit(large, 7);
      const mediumParts = evenSplit(medium, 7);
      const smallParts = evenSplit(small, 7);
      allocations = dates.map((date, i) => ({
        date,
        large: largeParts[i],
        medium: mediumParts[i],
        small: smallParts[i],
      }));
    }
    await db.insert(illustrationDays).values(
      allocations.map((day) => ({
        id: id(),
        entryId,
        date: day.date,
        large: day.large,
        medium: day.medium,
        small: day.small,
      })),
    );
  }

  return c.json({ id: entryId }, 201);
});

app.patch("/api/illustrations/:id", async (c) => {
  const entryId = c.req.param("id");
  const body = await c.req.json<{
    eventId?: string | null;
    large?: number;
    medium?: number;
    small?: number;
    days?: { date: string; large: number; medium: number; small: number }[];
  }>();

  await db
    .update(illustrationEntries)
    .set({
      ...(body.eventId !== undefined ? { eventId: body.eventId } : {}),
      ...(body.large !== undefined ? { large: body.large } : {}),
      ...(body.medium !== undefined ? { medium: body.medium } : {}),
      ...(body.small !== undefined ? { small: body.small } : {}),
    })
    .where(eq(illustrationEntries.id, entryId));

  if (body.days) {
    await db.delete(illustrationDays).where(eq(illustrationDays.entryId, entryId));
    if (body.days.length) {
      await db.insert(illustrationDays).values(
        body.days.map((day) => ({
          id: id(),
          entryId,
          date: day.date,
          large: day.large,
          medium: day.medium,
          small: day.small,
        })),
      );
    }
  }

  return c.json({ ok: true });
});

app.delete("/api/illustrations/:id", async (c) => {
  await db.delete(illustrationEntries).where(
    eq(illustrationEntries.id, c.req.param("id")),
  );
  return c.json({ ok: true });
});

app.get("/api/summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!from || !to) return c.json({ error: "from and to are required" }, 400);

  const dayRows = await db
    .select()
    .from(illustrationEntries)
    .where(
      and(
        eq(illustrationEntries.entryType, "day"),
        gte(illustrationEntries.date, from),
        lte(illustrationEntries.date, to),
      ),
    );

  const allocated = await db
    .select()
    .from(illustrationDays)
    .where(
      and(gte(illustrationDays.date, from), lte(illustrationDays.date, to)),
    );

  const byDate = new Map<string, SizeCounts>();
  const empty = { large: 0, medium: 0, small: 0 };

  const bump = (date: string, counts: SizeCounts) => {
    byDate.set(date, addCounts(byDate.get(date) ?? empty, counts));
  };

  for (const row of dayRows) {
    if (row.date) bump(row.date, row);
  }
  for (const row of allocated) {
    bump(row.date, row);
  }

  const totals = [...byDate.values()].reduce(addCounts, empty);

  const practiceRows = await db.select().from(practices);
  const practiceDayRows = await db
    .select()
    .from(practiceDays)
    .where(and(gte(practiceDays.date, from), lte(practiceDays.date, to)));

  const dailyPractices = practiceRows.filter(
    (p) => p.entryType === "day" && p.date && p.date >= from && p.date <= to,
  ).length;
  const weeklyDistributed = practiceDayRows.length;

  return c.json({
    from,
    to,
    illustrations: {
      totals,
      byDate: Object.fromEntries(byDate),
    },
    practices: {
      dailyCount: dailyPractices,
      weeklyDaySlots: weeklyDistributed,
    },
  });
});

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";

await ensureSchema();

if (process.env.VERCEL !== "1") {
  serve({ fetch: app.fetch, port, hostname }, () => {
    console.log(`Server listening on http://${hostname}:${port}`);
  });
}
