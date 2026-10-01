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

  const [book] = await db().select().from(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.userId, me.id)));
  if (!book) return { error: "Это не ваша книга" };

  await db().insert(schema.entries).values({
    habitId: habit.id, userId: me.id, day, itemId,
    level: str(f, "level") === "minimum" ? "minimum" : "norm",
    values: { pages },
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

export async function finishBook(f: FormData) {
  const me = await requireUser();
  const id = Number(f.get("itemId"));
  await db().update(schema.items)
    .set({ status: "finished", finishedOn: today() })
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, me.id)));
  revalidatePath("/", "layout");
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
