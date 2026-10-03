import "server-only";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { groupEmoji } from "./emojiStore";

/** Смайлик для ленты: картинка — по адресу /emoji/{id}, не в странице. */
export type EmojiInfo = { id: number; code: string; label: string; hidden: boolean };
/** Реакции одним смайликом на одну запись: число, своя ли, кто поставил. */
export type ReactionSummary = {
  emojiId: number; count: number; mine: boolean;
  who: { name: string; avatarUrl: string | null }[];
};
/** «e12» — мысль (отметка 12), «c5» — комментарий 5. */
export type ReactionTarget = `e${number}` | `c${number}`;

export function parseReactionTarget(t: string): { entryId: number } | { commentId: number } | null {
  const m = /^([ec])(\d+)$/.exec(t);
  if (!m) return null;
  return m[1] === "e" ? { entryId: Number(m[2]) } : { commentId: Number(m[2]) };
}

/** Набор смайликов группы для ленты: видимые — для выбора, скрытые — чтобы рисовать старые реакции. */
export async function emojiCatalog(groupId: number): Promise<EmojiInfo[]> {
  return (await groupEmoji(groupId)).map((e) => ({ id: e.id, code: e.code, label: e.label, hidden: e.isHidden }));
}

/** До 6 последних смайликов, которыми реагировал пользователь (видимые). */
export async function recentEmoji(me: User): Promise<number[]> {
  const rows = await db().select({ id: schema.reactions.emojiId })
    .from(schema.reactions)
    .innerJoin(schema.customEmoji, eq(schema.customEmoji.id, schema.reactions.emojiId))
    .where(and(eq(schema.reactions.userId, me.id), eq(schema.customEmoji.isHidden, false)))
    .orderBy(desc(schema.reactions.createdAt), desc(schema.reactions.id))
    .limit(60);
  return [...new Set(rows.map((r) => r.id))].slice(0, 6);
}

/** Реакции на мысли и комментарии группы, сгруппированные по смайлику в порядке первой реакции. */
export async function reactionsFor(me: User, entryIds: number[], commentIds: number[]) {
  const out = {
    entries: Object.fromEntries(entryIds.map((id) => [id, [] as ReactionSummary[]])) as Record<number, ReactionSummary[]>,
    comments: Object.fromEntries(commentIds.map((id) => [id, [] as ReactionSummary[]])) as Record<number, ReactionSummary[]>,
  };
  if (!entryIds.length && !commentIds.length) return out;
  const rows = await db().select({ r: schema.reactions, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
    .from(schema.reactions)
    .innerJoin(schema.users, eq(schema.users.id, schema.reactions.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId),
      or(
        entryIds.length ? inArray(schema.reactions.entryId, entryIds) : undefined,
        commentIds.length ? inArray(schema.reactions.commentId, commentIds) : undefined,
      ),
    ))
    .orderBy(asc(schema.reactions.createdAt), asc(schema.reactions.id));
  for (const { r, name, avatarUrl } of rows) {
    const list = r.entryId ? out.entries[r.entryId] : r.commentId ? out.comments[r.commentId] : undefined;
    if (!list) continue;
    let s = list.find((x) => x.emojiId === r.emojiId);
    if (!s) list.push(s = { emojiId: r.emojiId, count: 0, mine: false, who: [] });
    s.count++;
    s.mine ||= r.userId === me.id;
    s.who.push({ name: r.userId === me.id ? "Вы" : name, avatarUrl });
  }
  return out;
}

/** Мысль или комментарий из группы пользователя — на них можно реагировать. */
export async function reactableTarget(me: User, t: { entryId: number } | { commentId: number }) {
  if ("entryId" in t) {
    const [row] = await db().select({ id: schema.entries.id, note: schema.entries.note, g: schema.users.groupId })
      .from(schema.entries).innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
      .where(eq(schema.entries.id, t.entryId));
    return row && row.g === me.groupId && row.note ? row : null;
  }
  const [row] = await db().select({ id: schema.comments.id, g: schema.users.groupId })
    .from(schema.comments).innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(eq(schema.comments.id, t.commentId));
  return row && row.g === me.groupId ? row : null;
}

/** Чужие реакции на мои мысли и комментарии после последнего захода в ленту — для бейджа. */
export async function unreadReactions(me: User): Promise<number> {
  const seen = me.lastFeedSeenAt;
  const myEntries = db().select({ id: schema.entries.id }).from(schema.entries).where(eq(schema.entries.userId, me.id));
  const myComments = db().select({ id: schema.comments.id }).from(schema.comments).where(eq(schema.comments.userId, me.id));
  const [row] = await db().select({ n: sql<number>`count(*)` }).from(schema.reactions)
    .innerJoin(schema.users, eq(schema.users.id, schema.reactions.userId))
    .where(and(
      eq(schema.users.groupId, me.groupId), ne(schema.reactions.userId, me.id),
      or(inArray(schema.reactions.entryId, myEntries), inArray(schema.reactions.commentId, myComments)),
      seen ? sql`${schema.reactions.createdAt} > ${seen.toISOString()}::timestamp` : undefined,
    ));
  return Number(row?.n ?? 0);
}
