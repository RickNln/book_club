"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { createSession, destroySession, requireAdmin, requireUser } from "@/lib/auth";
import { addDays, canBackfillYesterday, today } from "@/lib/dates";
import { readingHabit } from "@/lib/data";
import { cleanCover, editableBook } from "@/lib/books";
import { NOTE_MAX, commentsFor, feedPage, groupEntry, groupFinishedItem, parseTarget, type FeedComment, type FeedPage } from "@/lib/feed";
import type { Entry } from "@/db/schema";

export type FormState = { error?: string; ok?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = Number(str(f, k));
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : NaN;
};

// ---------- Вход ----------
export async function login(_: FormState, f: FormData): Promise<FormState> {
  const loginName = str(f, "login").toLowerCase();
  const password = str(f, "password");
  if (!loginName || !password) return { error: "Введите логин и пароль" };
  const [u] = await db().select().from(schema.users).where(eq(schema.users.login, loginName));
  if (!u || !u.isActive || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: "Логин или пароль не подошли. Если забыли пароль, попросите админа сбросить его" };
  }
  await createSession(u.id);
  redirect("/");
}

export async function logout() {
  destroySession();
  redirect("/login");
}

// ---------- Отметка вечера ----------
export async function logReading(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const habit = await readingHabit(me.groupId);
  const t = today();
  const day = str(f, "day") === "yesterday" ? addDays(t, -1) : t;
  if (day !== t && !canBackfillYesterday()) return { error: "Вчерашний вечер можно отметить только до 12:00" };

  const itemId = Number(str(f, "itemId"));
  const pages = num(f, "pages");
  if (!itemId) return { error: "Выберите книгу или добавьте новую" };
  if (Number.isNaN(pages) || pages > 2000) return { error: "Укажите, сколько страниц прочитали" };

  const note = str(f, "note");
  if (note.length > NOTE_MAX) return { error: `Мысль — не длиннее ${NOTE_MAX} символов` };
  const [book] = await db().select().from(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.userId, me.id)));
  if (!book) return { error: "Это не ваша книга" };

  await db().insert(schema.entries).values({
    habitId: habit.id, userId: me.id, day, itemId,
    level: str(f, "level") === "minimum" ? "minimum" : "norm",
    values: { pages },
    // мысль необязательна — вечер засчитывается и без неё
    ...(note ? { note, isSpoiler: f.get("isSpoiler") === "on", noteCreatedAt: new Date(), noteUpdatedAt: new Date() } : {}),
  });
  revalidatePath("/", "layout");
  return { ok: day === t ? "Вечер засчитан" : "Вчерашний вечер засчитан" };
}

export async function undoEntry(f: FormData) {
  const me = await requireUser();
  const id = Number(f.get("entryId"));
  await db().delete(schema.entries).where(and(eq(schema.entries.id, id), eq(schema.entries.userId, me.id)));
  revalidatePath("/", "layout");
}

// ---------- Книги ----------
export async function addBook(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const habit = await readingHabit(me.groupId);
  const title = str(f, "title");
  if (!title) return { error: "Введите название книги" };
  const total = num(f, "totalPages");
  await db().insert(schema.items).values({
    userId: me.id, habitId: habit.id, title,
    author: str(f, "author") || null,
    totalPages: Number.isNaN(total) || total === 0 ? null : total,
    coverUrl: cleanCover(str(f, "coverUrl")),
    startedOn: today(),
  });
  revalidatePath("/", "layout");
  return { ok: `«${title}» на столе` };
}

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function updateBook(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const book = await editableBook(me, Number(f.get("itemId")));
  if (!book) return { error: "Эту книгу может править только её владелец или админ" };
  const title = str(f, "title");
  if (!title) return { error: "Название не может быть пустым" };
  const total = num(f, "totalPages");
  const status = str(f, "status") === "finished" ? "finished" : "active";
  const startedOn = str(f, "startedOn");
  const finishedOn = str(f, "finishedOn");
  if (!isDay(startedOn)) return { error: "Укажите дату начала" };
  if (status === "finished" && finishedOn && finishedOn < startedOn) return { error: "Книгу нельзя дочитать раньше, чем начать" };
  const rawCover = str(f, "coverUrl");
  const cover = cleanCover(rawCover);
  if (rawCover && !cover) return { error: "Обложка: нужна ссылка на картинку или файл до ~300 КБ" };
  await db().update(schema.items).set({
    title,
    author: str(f, "author") || null,
    totalPages: Number.isNaN(total) || total === 0 ? null : total,
    coverUrl: cover,
    status,
    startedOn,
    finishedOn: status === "finished" ? (isDay(finishedOn) ? finishedOn : today()) : null,
  }).where(eq(schema.items.id, book.id));
  revalidatePath("/", "layout");
  return { ok: "Сохранено" };
}

export async function deleteBook(f: FormData) {
  const me = await requireUser();
  const book = await editableBook(me, Number(f.get("itemId")));
  if (!book) return;
  // отметки вечеров остаются — серии не ломаются, просто без книги
  await db().update(schema.entries).set({ itemId: null }).where(eq(schema.entries.itemId, book.id));
  await db().delete(schema.items).where(eq(schema.items.id, book.id));
  revalidatePath("/", "layout");
  redirect("/shelf");
}

/** Оценка 1–5 из формы; null — не выбрана. */
const ratingOf = (f: FormData) => {
  const r = Number(str(f, "rating"));
  return Number.isInteger(r) && r >= 1 && r <= 5 ? r : null;
};

/**
 * «Дочитал»: книга уходит на полку и в ленту. Оценка обязательна,
 * если не нажали «Пропустить» — тогда её можно поставить позже на странице книги.
 */
export async function finishBook(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const id = Number(f.get("itemId"));
  const skip = str(f, "skip") === "1";
  const rating = skip ? null : ratingOf(f);
  const review = skip ? "" : str(f, "review");
  if (!skip && !rating) return { error: "Поставьте оценку от 1 до 5 звёзд или нажмите «Пропустить»" };
  if (review.length > NOTE_MAX) return { error: `Отзыв — не длиннее ${NOTE_MAX} символов` };
  const [book] = await db().select().from(schema.items)
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, me.id)));
  if (!book) return { error: "Это не ваша книга" };
  const now = new Date();
  await db().update(schema.items)
    .set({
      status: "finished", finishedOn: book.finishedOn ?? today(), finishedAt: book.finishedAt ?? now,
      rating, review: review || null, reviewUpdatedAt: book.finishedAt ?? now,
    })
    .where(eq(schema.items.id, book.id));
  revalidatePath("/", "layout");
  return { ok: rating ? `«${book.title}» на полке — ${"★".repeat(rating)}` : `«${book.title}» на полке` };
}

/** Оценка и отзыв дочитанной книги — правит только владелец. Первая оценка выводит книгу в ленту. */
export async function rateBook(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const rating = ratingOf(f);
  const review = str(f, "review");
  if (!rating) return { error: "Выберите оценку от 1 до 5 звёзд" };
  if (review.length > NOTE_MAX) return { error: `Отзыв — не длиннее ${NOTE_MAX} символов` };
  const [book] = await db().select().from(schema.items)
    .where(and(eq(schema.items.id, Number(f.get("itemId"))), eq(schema.items.userId, me.id)));
  if (!book) return { error: "Оценку ставит только тот, кто читал книгу" };
  if (book.status !== "finished") return { error: "Оценить можно дочитанную книгу" };
  const now = new Date();
  // первая оценка после «Пропустить» — не правка: пометки «изменено» нет
  const first = book.rating == null && !book.review;
  await db().update(schema.items)
    .set({ rating, review: review || null, finishedAt: book.finishedAt ?? now, reviewUpdatedAt: first ? (book.finishedAt ?? now) : now })
    .where(eq(schema.items.id, book.id));
  revalidatePath("/", "layout");
  return { ok: "Оценка сохранена" };
}

// ---------- Админка ----------
export async function createUser(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = str(f, "name");
  const loginName = str(f, "login").toLowerCase();
  const password = str(f, "password");
  if (!name || !loginName) return { error: "Нужны имя и логин" };
  if (!/^[a-z0-9_.-]{3,32}$/.test(loginName)) return { error: "Логин: 3–32 символа, латиница, цифры, точка, дефис" };
  if (password.length < 6) return { error: "Пароль — минимум 6 символов" };
  const [exists] = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.login, loginName));
  if (exists) return { error: `Логин «${loginName}» уже занят` };
  await db().insert(schema.users).values({
    groupId: admin.groupId, name, login: loginName,
    passwordHash: await bcrypt.hash(password, 10),
    role: str(f, "role") === "admin" ? "admin" : "member",
  });
  revalidatePath("/admin");
  return { ok: `Готово. Отправьте ${name}: логин ${loginName}, пароль ${password}` };
}

export async function resetPassword(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(f.get("userId"));
  const password = str(f, "password");
  if (password.length < 6) return { error: "Пароль — минимум 6 символов" };
  await db().update(schema.users).set({ passwordHash: await bcrypt.hash(password, 10) }).where(eq(schema.users.id, id));
  return { ok: `Новый пароль: ${password}` };
}

export async function toggleActive(f: FormData) {
  const admin = await requireAdmin();
  const id = Number(f.get("userId"));
  if (id === admin.id) return;
  const [u] = await db().select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) return;
  await db().update(schema.users).set({ isActive: !u.isActive }).where(eq(schema.users.id, id));
  revalidatePath("/admin");
}

// ---------- Профиль и аватарки ----------
export async function updateAvatar(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const targetId = Number(f.get("userId")) || me.id;
  if (targetId !== me.id) {
    if (me.role !== "admin") return { error: "Менять чужую аватарку может только админ" };
    const [t] = await db().select({ g: schema.users.groupId }).from(schema.users).where(eq(schema.users.id, targetId));
    if (!t || t.g !== me.groupId) return { error: "Участник не найден" };
  }
  const raw = str(f, "avatarUrl");
  const url = raw ? cleanCover(raw) : null;
  if (raw && (!url || url.length > 200_000)) return { error: "Нужна ссылка на картинку или фото до ~150 КБ" };
  await db().update(schema.users).set({ avatarUrl: url }).where(eq(schema.users.id, targetId));
  revalidatePath("/", "layout");
  return { ok: url ? "Аватарка сохранена" : "Аватарка убрана" };
}

export async function changeOwnPassword(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = str(f, "current");
  const next = str(f, "next");
  if (!(await bcrypt.compare(current, me.passwordHash))) return { error: "Текущий пароль не подошёл" };
  if (next.length < 6) return { error: "Новый пароль — минимум 6 символов" };
  await db().update(schema.users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(schema.users.id, me.id));
  return { ok: "Пароль изменён" };
}

// ---------- Мысли и лента ----------
/**
 * Поля мысли для сохранения: новая получает время создания, правка — только время изменения
 * (по разнице появляется пометка «изменено»). null — мысль надо удалить.
 */
function notePatch(entry: Entry, note: string, isSpoiler: boolean) {
  if (!note) return null;
  const now = new Date();
  if (!entry.note) return { note, isSpoiler, noteCreatedAt: now, noteUpdatedAt: now };
  if (entry.note === note && entry.isSpoiler === isSpoiler) return {};
  return { note, isSpoiler, noteUpdatedAt: now };
}

/** Добавить или изменить свою мысль; пустой текст — удалить её. */
export async function saveNote(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const entry = await groupEntry(me, Number(f.get("entryId")));
  if (!entry || entry.userId !== me.id) return { error: "Менять можно только свою мысль" };
  const note = str(f, "note");
  if (note.length > NOTE_MAX) return { error: `Мысль — не длиннее ${NOTE_MAX} символов` };
  const patch = notePatch(entry, note, f.get("isSpoiler") === "on");
  if (!patch) await clearNote(entry.id);
  else if (Object.keys(patch).length) await db().update(schema.entries).set(patch).where(eq(schema.entries.id, entry.id));
  revalidatePath("/", "layout");
  return { ok: note ? "Мысль сохранена" : "Мысль удалена" };
}

/** Мысль удаляется вместе с комментариями; отметка вечера и серия остаются. */
async function clearNote(entryId: number) {
  await db().delete(schema.comments).where(eq(schema.comments.entryId, entryId));
  await db().update(schema.entries)
    .set({ note: null, isSpoiler: false, noteCreatedAt: null, noteUpdatedAt: null })
    .where(eq(schema.entries.id, entryId));
}

/** Удалить мысль: автор или админ группы. */
export async function deleteNote(entryId: number): Promise<{ error?: string }> {
  const me = await requireUser();
  const entry = await groupEntry(me, entryId);
  if (!entry || (entry.userId !== me.id && me.role !== "admin")) return { error: "Удалить эту мысль может только автор или админ" };
  await clearNote(entry.id);
  revalidatePath("/", "layout");
  return {};
}

// ---------- История сессий ----------
/**
 * Правка своей сессии: книга (из своих), страницы, норма/минимум, мысль, спойлер.
 * Дату не меняем — задним числом пропуски не закрыть.
 */
export async function updateSession(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  const entry = await groupEntry(me, Number(f.get("entryId")));
  if (!entry || entry.userId !== me.id) return { error: "Менять можно только свою сессию" };
  const pages = num(f, "pages");
  if (Number.isNaN(pages) || pages > 2000) return { error: "Страниц — от 0 до 2000" };
  const note = str(f, "note");
  if (note.length > NOTE_MAX) return { error: `Мысль — не длиннее ${NOTE_MAX} символов` };
  const [book] = await db().select({ id: schema.items.id }).from(schema.items)
    .where(and(eq(schema.items.id, Number(str(f, "itemId"))), eq(schema.items.userId, me.id)));
  if (!book) return { error: "Выберите свою книгу" };
  const patch = notePatch(entry, note, f.get("isSpoiler") === "on");
  if (!patch) await clearNote(entry.id);
  await db().update(schema.entries).set({
    itemId: book.id,
    level: str(f, "level") === "minimum" ? "minimum" : "norm",
    values: { ...entry.values, pages },
    ...(patch ?? {}),
  }).where(eq(schema.entries.id, entry.id));
  revalidatePath("/", "layout");
  return { ok: "Сохранено" };
}

/** Удалить сессию: свою — всегда, чужую — только админ (например, ошибочную). */
export async function deleteSession(entryId: number): Promise<{ error?: string }> {
  const me = await requireUser();
  const entry = await groupEntry(me, entryId);
  if (!entry || (entry.userId !== me.id && me.role !== "admin")) return { error: "Удалить сессию может только автор или админ" };
  // комментарии к мысли удалятся каскадом
  await db().delete(schema.entries).where(eq(schema.entries.id, entry.id));
  revalidatePath("/", "layout");
  return {};
}

// ---------- Комментарии ----------
type CommentsResult = { error?: string; comments?: FeedComment[] };
const cleanComment = (v: unknown) => String(v ?? "").trim();
const keyOf = (c: { entryId: number | null; itemId: number | null }) => (c.entryId ? `e${c.entryId}` : `i${c.itemId}`);

/** Комментарий к мысли («e12») или к записи «дочитал(а)» («i5»). */
export async function addComment(target: string, text: string): Promise<CommentsResult> {
  const me = await requireUser();
  const t = cleanComment(text);
  if (!t) return { error: "Напишите комментарий" };
  if (t.length > NOTE_MAX) return { error: `Комментарий — не длиннее ${NOTE_MAX} символов` };
  const to = parseTarget(target);
  if (!to) return { error: "Запись не найдена" };
  if ("entryId" in to) {
    const entry = await groupEntry(me, to.entryId);
    if (!entry || !entry.note) return { error: "Мысль уже удалили" };
  } else if (!(await groupFinishedItem(me, to.itemId))) {
    return { error: "Запись о книге уже убрали" };
  }
  // время ставит приложение — как и last_feed_seen_at, чтобы бейдж не зависел от часового пояса базы
  const now = new Date();
  await db().insert(schema.comments).values({ ...to, userId: me.id, text: t, createdAt: now, updatedAt: now });
  return { comments: (await commentsFor(me, [target]))[target] };
}

export async function updateComment(commentId: number, text: string): Promise<CommentsResult> {
  const me = await requireUser();
  const t = cleanComment(text);
  if (!t) return { error: "Комментарий не может быть пустым" };
  if (t.length > NOTE_MAX) return { error: `Комментарий — не длиннее ${NOTE_MAX} символов` };
  const [c] = await db().select().from(schema.comments).where(eq(schema.comments.id, commentId));
  if (!c || c.userId !== me.id) return { error: "Менять можно только свой комментарий" };
  await db().update(schema.comments).set({ text: t, updatedAt: new Date() }).where(eq(schema.comments.id, c.id));
  return { comments: (await commentsFor(me, [keyOf(c)]))[keyOf(c)] };
}

export async function deleteComment(commentId: number): Promise<CommentsResult> {
  const me = await requireUser();
  const [c] = await db().select().from(schema.comments).where(eq(schema.comments.id, commentId));
  // commentsFor отдаёт только комментарии своей группы — так админ не удалит чужую группу
  const visible = c && (await commentsFor(me, [keyOf(c)]))[keyOf(c)].some((x) => x.id === c.id);
  if (!c || !visible || (c.userId !== me.id && me.role !== "admin")) return { error: "Удалить комментарий может только автор или админ" };
  await db().delete(schema.comments).where(eq(schema.comments.id, c.id));
  return { comments: (await commentsFor(me, [keyOf(c)]))[keyOf(c)] };
}

/** Следующие 20 записей ленты. */
export async function loadFeed(cursor: string): Promise<FeedPage> {
  return feedPage(await requireUser(), cursor);
}

/** Свежие комментарии к показанным записям — лента опрашивает, пока открыта. */
export async function refreshComments(keys: string[]): Promise<Record<string, FeedComment[]>> {
  const ok = keys.filter((k) => typeof k === "string" && parseTarget(k)).slice(0, 200);
  return commentsFor(await requireUser(), ok);
}

/** Лента открыта — бейдж непрочитанного обнуляется. */
export async function markFeedSeen() {
  const me = await requireUser();
  await db().update(schema.users).set({ lastFeedSeenAt: new Date() }).where(eq(schema.users.id, me.id));
  revalidatePath("/", "layout");
}
