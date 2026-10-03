import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { shortDate, timeLabel } from "./dates";
import { readingHabit } from "./data";

export const FEED_PAGE = 20;
export const NOTE_MAX = 1000;

/** Куда относится комментарий: «e12» — мысль (отметка 12), «i5» — запись «дочитал(а)» книги 5. */
export type TargetKey = `e${number}` | `i${number}`;
export function parseTarget(key: string): { entryId: number } | { itemId: number } | null {
  const m = /^([ei])(\d+)$/.exec(key);
  if (!m) return null;
  return m[1] === "e" ? { entryId: Number(m[2]) } : { itemId: Number(m[2]) };
}

export type FeedComment = {
  id: number; name: string; avatarUrl: string | null; text: string; at: string; edited: boolean;
  /** своё — можно править и удалять; canDelete — ещё и админ */
  mine: boolean; canDelete: boolean;
};
type FeedBase = {
  key: TargetKey; name: string; avatarUrl: string | null; at: string; edited: boolean;
  book: { title: string; coverUrl: string | null } | null;
  mine: boolean; canDelete: boolean; comments: FeedComment[];
};
export type NoteItem = FeedBase & { kind: "note"; id: number; day: string; pages: number; note: string; isSpoiler: boolean };
export type FinishedItem = FeedBase & { kind: "finished"; id: number; rating: number | null; review: string | null };
export type FeedItem = NoteItem | FinishedItem;
export type FeedPage = { items: FeedItem[]; next: string | null };

const isAdmin = (me: User) => me.role === "admin";
/** Время для сравнения в SQL: колонки без пояса хранят UTC, поэтому только ISO в UTC. */
const utc = (d: Date) => sql`${d.toISOString()}::timestamp`;
const wasEdited = (created: Date | null, updated: Date | null) =>
  !!created && !!updated && updated.getTime() - created.getTime() > 1000;

/** Комментарии к нескольким записям ленты сразу, старые сверху. */
export async function commentsFor(me: User, keys: string[]): Promise<Record<string, FeedComment[]>> {
  const out: Record<string, FeedComment[]> = Object.fromEntries(keys.map((k) => [k, []]));
  const targets = keys.map(parseTarget);
  const entryIds = targets.flatMap((t) => (t && "entryId" in t ? [t.entryId] : []));
  const itemIds = targets.flatMap((t) => (t && "itemId" in t ? [t.itemId] : []));
  if (!entryIds.length && !itemIds.length) return out;
  const rows = await db().select({ c: schema.comments, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(and(
      or(
        entryIds.length ? inArray(schema.comments.entryId, entryIds) : undefined,
        itemIds.length ? inArray(schema.comments.itemId, itemIds) : undefined,
      ),
      eq(schema.users.groupId, me.groupId),
    ))
    .orderBy(asc(schema.comments.createdAt), asc(schema.comments.id));
  for (const { c, name, avatarUrl } of rows) {
    const key = c.entryId ? `e${c.entryId}` : `i${c.itemId}`;
    out[key]?.push({
      id: c.id, name, avatarUrl, text: c.text, at: timeLabel(c.createdAt),
      edited: wasEdited(c.createdAt, c.updatedAt),
      mine: c.userId === me.id, canDelete: c.userId === me.id || isAdmin(me),
    });
  }
  return out;
}

/** Курсор «время_ключ»: всё строго раньше него по (время, ключ). */
type Cursor = { t: Date; key: string };
const parseCursor = (c?: string | null): Cursor | null => {
  const m = /^(.+)_([ei]\d+)$/.exec(c ?? "");
  const t = m ? new Date(m[1]) : null;
  return m && t && !Number.isNaN(t.getTime()) ? { t, key: m[2] } : null;
};
const before = (t: Date, key: string, c: Cursor | null) =>
  !c || t.getTime() < c.t.getTime() || (t.getTime() === c.t.getTime() && key < c.key);

/**
 * Страница ленты: мысли и записи «дочитал(а)» участников группы, новые сверху,
 * по FEED_PAGE штук. Мысли — по времени создания: правка не поднимает их наверх.
 */
export async function feedPage(me: User, cursor?: string | null): Promise<FeedPage> {
  const habit = await readingHabit(me.groupId);
  const cur = parseCursor(cursor);
  const noteTime = sql<Date>`coalesce(${schema.entries.noteCreatedAt}, ${schema.entries.noteUpdatedAt})`;

  const notes = await db().select({
    e: schema.entries, name: schema.users.name, avatarUrl: schema.users.avatarUrl,
    title: schema.items.title, coverUrl: schema.items.coverUrl,
  })
    .from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .leftJoin(schema.items, eq(schema.items.id, schema.entries.itemId))
    .where(and(
      eq(schema.entries.habitId, habit.id), eq(schema.users.groupId, me.groupId),
      isNotNull(schema.entries.note), isNotNull(schema.entries.noteUpdatedAt),
      cur ? sql`${noteTime} <= ${utc(cur.t)}` : undefined,
    ))
    .orderBy(desc(noteTime), desc(schema.entries.id))
    .limit(FEED_PAGE + 2);

  const finished = await db().select({ i: schema.items, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
    .from(schema.items)
    .innerJoin(schema.users, eq(schema.users.id, schema.items.userId))
    .where(and(
      eq(schema.items.habitId, habit.id), eq(schema.users.groupId, me.groupId),
      eq(schema.items.status, "finished"), isNotNull(schema.items.finishedAt),
      cur ? lte(schema.items.finishedAt, cur.t) : undefined, // колонка сама переводит в UTC
    ))
    .orderBy(desc(schema.items.finishedAt), desc(schema.items.id))
    .limit(FEED_PAGE + 2);

  type Row = { t: Date; key: TargetKey; build: () => Omit<FeedItem, "comments"> };
  const rows: Row[] = [
    ...notes.map(({ e, name, avatarUrl, title, coverUrl }): Row => {
      const t = e.noteCreatedAt ?? e.noteUpdatedAt!;
      return {
        t, key: `e${e.id}`, build: () => ({
          kind: "note", key: `e${e.id}`, id: e.id, name, avatarUrl, day: shortDate(e.day), at: timeLabel(t),
          edited: wasEdited(e.noteCreatedAt, e.noteUpdatedAt),
          book: title ? { title, coverUrl } : null,
          pages: Number(e.values?.pages ?? 0), note: e.note!, isSpoiler: e.isSpoiler,
          mine: e.userId === me.id, canDelete: e.userId === me.id || isAdmin(me),
        }),
      };
    }),
    ...finished.map(({ i, name, avatarUrl }): Row => ({
      t: i.finishedAt!, key: `i${i.id}`, build: () => ({
        kind: "finished", key: `i${i.id}`, id: i.id, name, avatarUrl, at: timeLabel(i.finishedAt!),
        edited: wasEdited(i.finishedAt, i.reviewUpdatedAt),
        book: { title: i.title, coverUrl: i.coverUrl }, rating: i.rating, review: i.review,
        // запись о дочитанной книге убирается, только если книгу вернуть в «читаю» или удалить
        mine: i.userId === me.id, canDelete: false,
      }),
    })),
  ]
    .filter((r) => before(r.t, r.key, cur))
    .sort((a, b) => b.t.getTime() - a.t.getTime() || (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  const page = rows.slice(0, FEED_PAGE);
  const comments = await commentsFor(me, page.map((r) => r.key));
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({ ...r.build(), comments: comments[r.key] ?? [] }) as FeedItem),
    next: rows.length > FEED_PAGE && last ? `${last.t.toISOString()}_${last.key}` : null,
  };
}

/** Новые мысли, дочитанные книги и комментарии других участников с последнего захода в ленту. */
export async function unreadCount(me: User): Promise<number> {
  const seen = me.lastFeedSeenAt;
  const noteTime = sql`coalesce(${schema.entries.noteCreatedAt}, ${schema.entries.noteUpdatedAt})`;
  const [notes] = await db().select({ n: count() }).from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId), ne(schema.entries.userId, me.id), isNotNull(schema.entries.note),
      seen ? sql`${noteTime} > ${utc(seen)}` : undefined,
    ));
  const [books] = await db().select({ n: count() }).from(schema.items)
    .innerJoin(schema.users, eq(schema.users.id, schema.items.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId), ne(schema.items.userId, me.id),
      eq(schema.items.status, "finished"), isNotNull(schema.items.finishedAt),
      seen ? gt(schema.items.finishedAt, seen) : undefined,
    ));
  const [comms] = await db().select({ n: count() }).from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId), ne(schema.comments.userId, me.id),
      seen ? gt(schema.comments.createdAt, seen) : undefined,
    ));
  return Number(notes?.n ?? 0) + Number(books?.n ?? 0) + Number(comms?.n ?? 0);
}

/** Отметка из группы пользователя — для прав на мысль, сессию и комментарии. */
export async function groupEntry(me: User, entryId: number) {
  const [row] = await db().select({ e: schema.entries, groupId: schema.users.groupId })
    .from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .where(eq(schema.entries.id, entryId));
  return row && row.groupId === me.groupId ? row.e : null;
}

/** Дочитанная книга из группы пользователя — её запись в ленте можно комментировать. */
export async function groupFinishedItem(me: User, itemId: number) {
  const [row] = await db().select({ i: schema.items, groupId: schema.users.groupId })
    .from(schema.items)
    .innerJoin(schema.users, eq(schema.users.id, schema.items.userId))
    .where(eq(schema.items.id, itemId));
  return row && row.groupId === me.groupId && row.i.status === "finished" && row.i.finishedAt ? row.i : null;
}
