"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";

const items = [
  { href: "/", label: "Дашборд", d: "M4 13h6V4H4zm10 7h6v-9h-6zM4 20h6v-4H4zm10-11h6V4h-6z" },
  { href: "/today", label: "Сегодня", d: "M12 5v14M5 12h14" },
  { href: "/shelf", label: "Полка", d: "M5 4h3v16H5zm5 0h3v16h-3zm5.5 1 2.9-.8 4 15.5-2.9.8z" },
];
const admin = { href: "/admin", label: "Админ", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0" };

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

function Icon({ d, stroke }: { d: string; stroke?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"} strokeWidth={stroke ? 2.5 : 0} strokeLinecap="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Нижняя панель — телефон и планшет. */
export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const on = useActive();
  const list = isAdmin ? [...items, admin] : items;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-night/90 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        {list.map((it) => {
          const main = it.href === "/today";
          return (
            <li key={it.href} className="flex-1">
              <Link href={it.href} className={`flex flex-col items-center gap-1 py-3 text-[12px] ${on(it.href) ? "text-teal" : "text-muted"}`}>
                <span className={main ? "grid h-9 w-9 place-items-center rounded-full bg-teal text-night -mt-1" : ""}>
                  <Icon d={it.d} stroke={main} />
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Боковое меню — компьютер. */
export function Sidebar({ isAdmin, name, avatarUrl }: { isAdmin: boolean; name: string; avatarUrl: string | null }) {
  const on = useActive();
  const list = isAdmin ? [...items.filter((i) => i.href !== "/today"), admin] : items.filter((i) => i.href !== "/today");
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-night/80 px-5 py-8 backdrop-blur lg:flex">
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-10 w-10" />
        <span className="font-display text-[17px] font-bold leading-tight">Книжная<br />ночь</span>
      </Link>

      <Link href="/today" className="btn-primary mt-10 w-full">Отметить вечер</Link>

      <ul className="mt-8 space-y-1">
        {list.map((it) => (
          <li key={it.href}>
            <Link href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition
                ${on(it.href) ? "bg-teal/10 text-teal" : "text-muted hover:bg-raised hover:text-ink"}`}>
              <Icon d={it.d} />{it.label}
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/profile"
        className={`mt-auto flex items-center gap-3 rounded-xl border p-3 transition hover:bg-raised ${on("/profile") ? "border-teal/50" : "border-line"}`}>
        <Avatar name={name} url={avatarUrl} size={40} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{name}</span>
          <span className="block text-[12px] text-muted">Профиль и аватарка</span>
        </span>
      </Link>
    </aside>
  );
}
