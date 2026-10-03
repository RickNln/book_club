import {
  pgTable, serial, text, integer, boolean, timestamp, jsonb, date, index,
} from "drizzle-orm/pg-core";

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id).notNull(),
  name: text("name").notNull(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] }).default("member").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  /** Ссылка или сжатая в браузере картинка (data URL) */
  avatarUrl: text("avatar_url"),
  /** Когда участник последний раз открывал ленту — для бейджа непрочитанного */
  lastFeedSeenAt: timestamp("last_feed_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Любая привычка. Чтение — первая; новые добавляются записью, без смены схемы. */
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id).notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  targetMinutes: integer("target_minutes").default(20).notNull(),
  minMinutes: integer("min_minutes").default(5).notNull(),
  freezesPerWeek: integer("freezes_per_week").default(1).notNull(),
  /** Описание полей отметки, напр. [{key:"pages",type:"number"},{key:"itemId",type:"item"}] */
  fields: jsonb("fields").$type<{ key: string; type: string; label: string }[]>().default([]).notNull(),
  startedOn: date("started_on", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Объекты привычки: для чтения — книги. */
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  habitId: integer("habit_id").references(() => habits.id).notNull(),
  title: text("title").notNull(),
  author: text("author"),
  totalPages: integer("total_pages"),
  coverUrl: text("cover_url"),
  status: text("status", { enum: ["active", "finished"] }).default("active").notNull(),
  startedOn: date("started_on", { mode: "string" }).notNull(),
  finishedOn: date("finished_on", { mode: "string" }),
}, (t) => ({ byUser: index("items_user_idx").on(t.userId, t.status) }));

/** Отметка за день. Несколько записей в день допустимы (две книги), день засчитывается один раз. */
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  level: text("level", { enum: ["norm", "minimum"] }).default("norm").notNull(),
  itemId: integer("item_id").references(() => items.id),
  values: jsonb("values").$type<Record<string, number | string>>().default({}).notNull(),
  /** «Что запомнилось?» — мысль после чтения, до 1000 символов; попадает в ленту */
  note: text("note"),
  isSpoiler: boolean("is_spoiler").default(false).notNull(),
  noteUpdatedAt: timestamp("note_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ byDay: index("entries_habit_day_idx").on(t.habitId, t.day) }));

/** Комментарии к мысли в ленте, без вложенности. Удаляются вместе с мыслью или отметкой. */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").references(() => entries.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ byEntry: index("comments_entry_idx").on(t.entryId, t.createdAt) }));

export type User = typeof users.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type Comment = typeof comments.$inferSelect;
