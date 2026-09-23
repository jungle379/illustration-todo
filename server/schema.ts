import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const practices = sqliteTable(
  "practices",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    entryType: text("entry_type", { enum: ["day", "week"] }).notNull(),
    date: text("date"),
    weekStart: text("week_start"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("practices_date_idx").on(table.date),
    index("practices_week_idx").on(table.weekStart),
  ],
);

export const practiceDays = sqliteTable(
  "practice_days",
  {
    id: text("id").primaryKey(),
    practiceId: text("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
  },
  (table) => [index("practice_days_date_idx").on(table.date)],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    notes: text("notes").notNull().default(""),
    largeNeeded: integer("large_needed").notNull().default(0),
    mediumNeeded: integer("medium_needed").notNull().default(0),
    smallNeeded: integer("small_needed").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("events_date_idx").on(table.date)],
);

export const illustrationEntries = sqliteTable(
  "illustration_entries",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    entryType: text("entry_type", { enum: ["day", "week"] }).notNull(),
    date: text("date"),
    weekStart: text("week_start"),
    large: integer("large").notNull().default(0),
    medium: integer("medium").notNull().default(0),
    small: integer("small").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("illust_date_idx").on(table.date),
    index("illust_week_idx").on(table.weekStart),
    index("illust_event_idx").on(table.eventId),
  ],
);

export const illustrationDays = sqliteTable(
  "illustration_days",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => illustrationEntries.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    large: integer("large").notNull().default(0),
    medium: integer("medium").notNull().default(0),
    small: integer("small").notNull().default(0),
  },
  (table) => [index("illust_days_date_idx").on(table.date)],
);
