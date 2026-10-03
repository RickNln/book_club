"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import { addBook, changeOwnPassword, createUser, deleteBook, login, logReading, resetPassword, updateAvatar, updateBook } from "@/app/actions";
import { Avatar } from "./Avatar";
import { FactCard } from "./FactCard";
import type { PersonalContext } from "@/content/facts";

function Submit({ children, className = "btn-primary w-full" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className}>{pending ? "Секунду…" : children}</button>;
}
function Msg({ s }: { s: FormState }) {
  if (s.error) return <p role="alert" className="text-[14px] text-lamp">{s.error}</p>;
  if (s.ok) return <p role="status" className="text-[14px] text-teal">{s.ok}</p>;
  return null;
}

export function LoginForm() {
  const [s, act] = useFormState(login, {});
  return (
    <form action={act} className="space-y-3">
      <input name="login" autoComplete="username" placeholder="Логин" className="input" autoCapitalize="none" />
      <input name="password" type="password" autoComplete="current-password" placeholder="Пароль" className="input" />
      <Msg s={s} />
      <Submit>Войти</Submit>
    </form>
  );
}

type Book = { id: number; title: string };
type FactProps = { ctx: PersonalContext; missedYesterday: boolean; today: string };
export function LogForm({ books, canYesterday, fact }: { books: Book[]; canYesterday: boolean; fact: FactProps }) {
  const [s, act] = useFormState(logReading, {});
  const ref = useRef<HTMLFormElement>(null);
  // каждая успешная отметка — новый факт в награду
  const [rewards, setRewards] = useState(0);
  useEffect(() => { if (s.ok) { ref.current?.reset(); setRewards((n) => n + 1); } }, [s]);
  if (!books.length) return null;
  return (
    <div className="space-y-4">
    <form ref={ref} action={act} className="card space-y-4 p-5">
      <label className="block">
        <span className="label">Книга</span>
        <select name="itemId" defaultValue={books[0].id} className="input mt-1">
          {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Сколько страниц прочитали</span>
        <input name="pages" type="number" inputMode="numeric" min={0} max={2000} placeholder="Например, 24" className="input mt-1 num text-xl" required />
      </label>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label mb-1">Сколько читали</legend>
        <Choice name="level" value="norm" label="20+ минут" defaultChecked />
        <Choice name="level" value="minimum" label="Минимум, 5+" />
      </fieldset>
      {canYesterday && (
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="label mb-1">За какой вечер</legend>
          <Choice name="day" value="today" label="Сегодня" defaultChecked />
          <Choice name="day" value="yesterday" label="Вчера" />
        </fieldset>
      )}
      <Msg s={s} />
      <Submit>Прочитал</Submit>
    </form>
    {rewards > 0 && <FactCard key={rewards} {...fact} />}
    </div>
  );
}

function Choice({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="block rounded-xl border border-line px-3 py-2.5 text-center text-[14px] text-muted
        peer-checked:border-teal peer-checked:bg-teal/10 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-teal/50">
        {label}
      </span>
    </label>
  );
}

export function AddBookForm({ open: initial = false }: { open?: boolean }) {
  const [open, setOpen] = useState(initial);
  const [s, act] = useFormState(addBook, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s.ok) { ref.current?.reset(); setOpen(false); } }, [s]);
  if (!open) {
    return (
      <div>
        {s.ok && <Msg s={s} />}
        <button onClick={() => setOpen(true)} className="btn-ghost mt-2 w-full">Добавить книгу</button>
      </div>
    );
  }
  return (
    <form ref={ref} action={act} className="card space-y-3 p-5">
      <h2 className="font-semibold">Новая книга</h2>
      <input name="title" placeholder="Название" className="input" required />
      <input name="author" placeholder="Автор (необязательно)" className="input" />
      <input name="totalPages" type="number" inputMode="numeric" placeholder="Всего страниц (для прогресса)" className="input" />
      <CoverInput />
      <Msg s={s} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Отмена</button>
        <Submit className="btn-primary">Добавить</Submit>
      </div>
    </form>
  );
}

export function CreateUserForm() {
  const [s, act] = useFormState(createUser, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s.ok) ref.current?.reset(); }, [s]);
  return (
    <form ref={ref} action={act} className="card space-y-3 p-5">
      <h2 className="font-semibold">Новый участник</h2>
      <input name="name" placeholder="Имя, как будет на дашборде" className="input" required />
      <input name="login" placeholder="Логин (латиница)" className="input" autoCapitalize="none" required />
      <div className="flex gap-2">
        <input name="password" placeholder="Пароль" className="input" required minLength={6} id="newpass" />
        <button type="button" className="btn-ghost shrink-0 px-3" onClick={() => {
          const el = document.getElementById("newpass") as HTMLInputElement;
          el.value = Math.random().toString(36).slice(2, 10);
        }}>Придумать</button>
      </div>
      <label className="flex items-center gap-2 text-[14px] text-muted">
        <input type="checkbox" name="role" value="admin" className="accent-teal" /> Тоже админ
      </label>
      <Msg s={s} />
      <Submit>Создать</Submit>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: number }) {
  const [s, act] = useFormState(resetPassword, {});
  return (
    <form action={act} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input name="password" placeholder="Новый пароль" minLength={6} className="input flex-1 basis-40 py-2 lg:text-[14px]" required />
      <Submit className="btn-ghost py-2 text-[14px]">Сбросить</Submit>
      <div className="w-full"><Msg s={s} /></div>
    </form>
  );
}

/** Сжимает картинку в браузере до 360 px по высоте, JPEG — помещается прямо в базу. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url;
    });
    const h = Math.min(360, img.naturalHeight);
    const w = Math.round((img.naturalWidth / img.naturalHeight) * h);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CoverInput({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isData = value.startsWith("data:");
  return (
    <div className="flex gap-3">
      <div className="h-36 w-24 shrink-0 overflow-hidden rounded-md border border-line bg-raised">
        {value
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={value} alt="Обложка" className="h-full w-full object-cover" onError={() => setErr("Картинка по ссылке не открывается")} />
          : <div className="grid h-full place-items-center text-[10px] text-muted">нет</div>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input type="hidden" name="coverUrl" value={value} />
        <input
          type="url" placeholder="Ссылка на обложку" className="input py-2.5 lg:text-[14px]"
          value={isData ? "" : value} onChange={(e) => { setErr(""); setValue(e.target.value.trim()); }}
          aria-label="Ссылка на обложку"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-ghost cursor-pointer px-3 py-2 text-[13px]">
            {busy ? "Сжимаю…" : isData ? "Заменить файл" : "Загрузить фото"}
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true); setErr("");
              try { setValue(await shrink(f)); } catch { setErr("Не получилось прочитать картинку"); }
              setBusy(false);
            }} />
          </label>
          {value && <button type="button" className="text-[13px] text-muted hover:text-ink" onClick={() => setValue("")}>Убрать</button>}
        </div>
        {err && <p className="text-[12px] text-lamp">{err}</p>}
      </div>
    </div>
  );
}

type EditableBook = {
  id: number; title: string; author: string | null; totalPages: number | null; coverUrl: string | null;
  status: "active" | "finished"; startedOn: string; finishedOn: string | null;
};

export function EditBookForm({ book }: { book: EditableBook }) {
  const [s, act] = useFormState(updateBook, {});
  const [status, setStatus] = useState(book.status);
  return (
    <div className="space-y-4">
      <form action={act} className="card space-y-4 p-5 lg:p-7">
        <input type="hidden" name="itemId" value={book.id} />
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className="label">Название</span>
            <input name="title" defaultValue={book.title} className="input mt-1" required />
          </label>
          <label className="block">
            <span className="label">Автор</span>
            <input name="author" defaultValue={book.author ?? ""} className="input mt-1" />
          </label>
          <label className="block">
            <span className="label">Всего страниц</span>
            <input name="totalPages" type="number" inputMode="numeric" min={0} defaultValue={book.totalPages ?? ""} className="input mt-1" />
          </label>
        </div>

        <div>
          <span className="label">Обложка</span>
          <div className="mt-1"><CoverInput initial={book.coverUrl ?? ""} /></div>
        </div>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="label mb-1">Статус</legend>
          {(["active", "finished"] as const).map((v) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="status" value={v} checked={status === v} onChange={() => setStatus(v)} className="peer sr-only" />
              <span className="block rounded-xl border border-line px-3 py-2.5 text-center text-[14px] text-muted
                peer-checked:border-teal peer-checked:bg-teal/10 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-teal/50">
                {v === "active" ? "Читаю" : "Дочитал"}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Начал</span>
            <input name="startedOn" type="date" defaultValue={book.startedOn} className="input mt-1" required />
          </label>
          {status === "finished" && (
            <label className="block">
              <span className="label">Дочитал</span>
              <input name="finishedOn" type="date" defaultValue={book.finishedOn ?? ""} className="input mt-1" />
            </label>
          )}
        </div>

        <Msg s={s} />
        <Submit>Сохранить</Submit>
      </form>

      <form action={deleteBook} onSubmit={(e) => {
        if (!confirm(`Удалить «${book.title}»? Отметки вечеров останутся, серия не сломается.`)) e.preventDefault();
      }}>
        <input type="hidden" name="itemId" value={book.id} />
        <button className="w-full rounded-xl px-4 py-3 text-[14px] text-lamp hover:bg-lamp/10">Удалить книгу</button>
      </form>
    </div>
  );
}

/** Квадрат 192×192 из центра фото, JPEG. */
async function squareAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    c.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 192, 192);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarForm({ userId, name, url, compact = false }: { userId: number; name: string; url: string | null; compact?: boolean }) {
  const [s, act] = useFormState(updateAvatar, {});
  const [value, setValue] = useState(url ?? "");
  const [busy, setBusy] = useState(false);
  const changed = value !== (url ?? "");
  const size = compact ? 48 : 96;
  return (
    <form action={act} className="flex items-center gap-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="avatarUrl" value={value} />
      <Avatar name={name} url={value || null} size={size} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-ghost cursor-pointer px-3 py-2 text-[13px]">
            {busy ? "Сжимаю…" : value ? "Другое фото" : "Загрузить фото"}
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try { setValue(await squareAvatar(f)); } catch { /* сообщение ниже не нужно — превью не сменится */ }
              setBusy(false);
            }} />
          </label>
          {value && <button type="button" onClick={() => setValue("")} className="text-[13px] text-muted hover:text-ink">Убрать</button>}
          {changed && <Submit className="btn-primary px-3 py-2 text-[13px]">Сохранить</Submit>}
        </div>
        {!compact && !changed && !s.ok && !s.error && <p className="text-[12px] text-muted">Фото обрежется до квадрата по центру</p>}
        <Msg s={s} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [s, act] = useFormState(changeOwnPassword, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s.ok) ref.current?.reset(); }, [s]);
  return (
    <form ref={ref} action={act} className="space-y-3">
      <input name="current" type="password" autoComplete="current-password" placeholder="Текущий пароль" className="input" required />
      <input name="next" type="password" autoComplete="new-password" placeholder="Новый пароль, от 6 символов" className="input" required minLength={6} />
      <Msg s={s} />
      <Submit className="btn-ghost w-full">Сменить пароль</Submit>
    </form>
  );
}
