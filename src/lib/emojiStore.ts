/**
 * Набор смайликов группы: общие правила для админки и для разового скрипта scripts/seed-emoji.ts.
 * Без "server-only" — модуль запускается и из Node-скрипта.
 */
import { and, asc, eq, max } from "drizzle-orm";
import { db, schema } from "@/db";

export const EMOJI_LIMIT = 60;
export const EMOJI_MAX_BYTES = 60 * 1024;
export const LABEL_MAX = 30;
export const CODE_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** PNG или WebP в base64; размер считаем по декодированным байтам. */
export function checkEmojiImage(image: string): string | null {
  const m = /^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!m) return "Нужна картинка PNG или WebP";
  const bytes = Math.floor((m[2].length * 3) / 4) - (m[2].endsWith("==") ? 2 : m[2].endsWith("=") ? 1 : 0);
  if (bytes > EMOJI_MAX_BYTES) return `Картинка ${Math.round(bytes / 1024)} КБ — нужно до 60 КБ`;
  return null;
}

export type NewEmoji = { code: string; label: string; image: string };

export function checkNewEmoji(e: NewEmoji): string | null {
  if (!CODE_RE.test(e.code)) return "Код — латиница в нижнем регистре, цифры и дефис, до 40 символов: rick-shock";
  if (!e.label.trim() || e.label.trim().length > LABEL_MAX) return `Подпись — от 1 до ${LABEL_MAX} символов`;
  return checkEmojiImage(e.image);
}

export function groupEmoji(groupId: number) {
  return db().select().from(schema.customEmoji)
    .where(eq(schema.customEmoji.groupId, groupId))
    .orderBy(asc(schema.customEmoji.sortOrder), asc(schema.customEmoji.id));
}

/**
 * Добавить смайлик в конец набора группы. Повтор кода — не ошибка базы, а понятный отказ
 * (так скрипт можно запускать повторно без дублей).
 */
export async function insertEmoji(groupId: number, createdBy: number | null, e: NewEmoji):
  Promise<{ ok: true; id: number } | { ok: false; error: string; duplicate?: boolean }> {
  const error = checkNewEmoji(e);
  if (error) return { ok: false, error };
  const all = await groupEmoji(groupId);
  if (all.some((x) => x.code === e.code)) return { ok: false, error: `Код «${e.code}» уже есть в наборе`, duplicate: true };
  if (all.length >= EMOJI_LIMIT) return { ok: false, error: `В наборе уже ${EMOJI_LIMIT} смайликов — это предел` };
  const [last] = await db().select({ m: max(schema.customEmoji.sortOrder) }).from(schema.customEmoji)
    .where(eq(schema.customEmoji.groupId, groupId));
  try {
    const [row] = await db().insert(schema.customEmoji).values({
      groupId, createdBy, code: e.code, label: e.label.trim(), image: e.image, sortOrder: (last?.m ?? 0) + 1,
    }).returning({ id: schema.customEmoji.id });
    return { ok: true, id: row.id };
  } catch (err) {
    // гонка двух вставок одного кода — уникальный индекс (group_id, code)
    if (String((err as Error).message).includes("custom_emoji_group_code")) {
      return { ok: false, error: `Код «${e.code}» уже есть в наборе`, duplicate: true };
    }
    throw err;
  }
}

/** Смайлик группы по id — для проверки прав в действиях. */
export async function emojiOfGroup(groupId: number, id: number) {
  const [e] = await db().select().from(schema.customEmoji)
    .where(and(eq(schema.customEmoji.id, id), eq(schema.customEmoji.groupId, groupId)));
  return e ?? null;
}
