import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { AvatarForm, CreateUserForm, ResetPasswordForm } from "@/components/forms";
import { logout, toggleActive } from "@/app/actions";
import Link from "next/link";

export default async function Admin() {
  const me = await requireAdmin();
  const users = await db().select().from(schema.users)
    .where(eq(schema.users.groupId, me.groupId)).orderBy(asc(schema.users.createdAt));

  return (
    <div className="space-y-4 lg:space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="label">Регистрации нет — аккаунты выдаёте вы. Книги любого участника можно править на полке</div>
          <h1 className="font-display text-xl font-bold lg:text-3xl">Участники</h1>
        </div>
        <form action={logout} className="shrink-0"><button className="text-[13px] text-muted">Выйти</button></form>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-6 [&>*]:min-w-0">
      <div className="lg:sticky lg:top-10"><CreateUserForm /></div>

      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className={`card p-4 ${u.isActive ? "" : "opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{u.name}{u.role === "admin" && <span className="ml-2 text-[12px] text-teal">админ</span>}</div>
                <div className="truncate text-[13px] text-muted">{u.login}{u.isActive ? "" : " · отключён"}</div>
              </div>
              {u.id !== me.id && (
                <form action={toggleActive} className="shrink-0">
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="btn-ghost px-3 py-2 text-[13px]">{u.isActive ? "Отключить" : "Включить"}</button>
                </form>
              )}
            </div>
            <div className="mt-3"><AvatarForm userId={u.id} name={u.name} url={u.avatarUrl} compact /></div>
            <ResetPasswordForm userId={u.id} />
            <Link href={`/shelf#u-${u.id}`} className="mt-2 inline-block text-[13px] text-teal">Книги участника</Link>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
