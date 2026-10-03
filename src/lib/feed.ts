import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { shortDate, timeLabel } from "./dates";
import { readingHabit } from "./data";

export const FEED_PAGE = 20;
export const NOTE_MAX = 1000;

export type FeedComment = {
  id: number; name: string; avatarUrl: string | null; text: string; at: string; edited: boolean;
  /** своё — можно править и удалять; canDelete — ещё и админ */
  mine: boolean; canDelete: boolean;
};
export type FeedItem = {
  id: number; name: string; avatarUrl: string | null; day: string; at: string;
  book: { title: string; coverUrl: string | null } | null;
  pages: number; note: string; isSpoiler: boolean;
  mine: boolean; canDelete: boolean;
  comments: FeedComment[];
};
export type FeedPage = { items: FeedItem[]; next: string | null };

const isAdmin = (me: User) => me.role === "admin";

/** Комментарии к нескольким мыслям сразу, старые сверху. */
export async function commentsFor(me: User, entryIds: number[]): Promise<Record<number, FeedComment[]>> {
  const out: Record<number, FeedComment[]> = Object.fromEntries(entryIds.map((id) => [id, []]));
  if (!entryIds.length) return out;
  const rows = await db().select({ c: schema.comments, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(and(inArray(schema.comments.entryId, entryIds), eq(schema.users.groupId, me.groupId)))
    .orderBy(asc(schema.comments.createdAt), asc(schema.comments.id));
  for (const { c, name, avatarUrl } of rows) {
    out[c.entryId]?.push({
      id: c.id, name, avatarUrl, text: c.text, at: timeLabel(c.createdAt),
      edited: c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
      mine: c.userId === me.id, canDelete: c.userId === me.id || isAdmin(me),
    });
  }
  return out;
}

/**
 * Страница ленты: мысли участников группы, новые сверху, по FEED_PAGE штук.
 * Курсор — «время_id» последней показанной мысли.
 */
export async function feedPage(me: User, cursor?: string | null): Promise<FeedPage> {
  const habit = await readingHabit(me.groupId);
  const [t, id] = (cursor ?? "").split("_");
  const after = cursor && t && Number(id)
    ? sql`(${schema.entries.noteUpdatedAt}, ${schema.entries.id}) < (${t}::timestamp, ${Number(id)})`
    : undefined;
  const rows = await db().select({
    e: schema.entries, name: schema.users.name, avatarUrl: schema.users.avatarUrl,
    title: schema.items.title, coverUrl: schema.items.coverUrl,
  })
    .from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .leftJoin(schema.items, eq(schema.items.id, schema.entries.itemId))
    .where(and(
      eq(schema.entries.habitId, habit.id), eq(schema.users.groupId, me.groupId),
      isNotNull(schema.entries.note), isNotNull(schema.entries.noteUpdatedAt), after,
    ))
    .orderBy(desc(schema.entries.noteUpdatedAt), desc(schema.entries.id))
    .limit(FEED_PAGE + 1);
  const page = rows.slice(0, FEED_PAGE);
  const comments = await commentsFor(me, page.map((r) => r.e.id));
  const last = page[page.length - 1];
  return {
    items: page.map(({ e, name, avatarUrl, title, coverUrl }) => ({
      id: e.id, name, avatarUrl, day: shortDate(e.day), at: timeLabel(e.noteUpdatedAt!),
      book: title ? { title, coverUrl } : null,
      pages: Number(e.values?.pages ?? 0), note: e.note!, isSpoiler: e.isSpoiler,
      mine: e.userId === me.id, canDelete: e.userId === me.id || isAdmin(me),
      comments: comments[e.id] ?? [],
    })),
    next: rows.length > FEED_PAGE && last ? `${last.e.noteUpdatedAt!.toISOString()}_${last.e.id}` : null,
  };
}

/** Новые мысли и комментарии других участников с последнего захода в ленту. */
export async function unreadCount(me: User): Promise<number> {
  const seen = me.lastFeedSeenAt;
  const [notes] = await db().select({ n: count() }).from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId), ne(schema.entries.userId, me.id), isNotNull(schema.entries.note),
      seen ? gt(schema.entries.noteUpdatedAt, seen) : undefined,
    ));
  const [comms] = await db().select({ n: count() }).from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId), ne(schema.comments.userId, me.id),
      seen ? gt(schema.comments.createdAt, seen) : undefined,
    ));
  return Number(notes?.n ?? 0) + Number(comms?.n ?? 0);
}

/** Отметка с мыслью из группы пользователя — для прав на мысль и комментарии. */
export async function groupEntry(me: User, entryId: number) {
  const [row] = await db().select({ e: schema.entries, groupId: schema.users.groupId })
    .from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .where(eq(schema.entries.id, entryId));
  return row && row.groupId === me.groupId ? row.e : null;
}
