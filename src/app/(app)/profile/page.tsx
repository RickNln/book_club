import { requireUser } from "@/lib/auth";
import { AvatarForm, PasswordForm } from "@/components/forms";
import Link from "next/link";
import { logout } from "@/app/actions";

export default async function Profile() {
  const me = await requireUser();
  return (
    <div className="mx-auto max-w-xl space-y-4 lg:space-y-5">
      <header>
        <div className="label truncate">{me.login}{me.role === "admin" ? " · админ" : ""}</div>
        <h1 className="font-display text-xl font-bold [overflow-wrap:anywhere] lg:text-3xl">{me.name}</h1>
      </header>
      <section className="card p-5 lg:p-7">
        <h2 className="mb-4 font-semibold">Аватарка</h2>
        <AvatarForm userId={me.id} name={me.name} url={me.avatarUrl} />
      </section>
      <section className="card p-5 lg:p-7">
        <h2 className="mb-4 font-semibold">Пароль</h2>
        <PasswordForm />
      </section>
      <Link href="/sessions" className="card flex items-center justify-between p-5 hover:bg-raised">
        <span><span className="block font-semibold">Мои сессии</span><span className="text-[13px] text-muted">История отметок: изменить или удалить</span></span>
        <span aria-hidden="true" className="text-muted">→</span>
      </Link>
      {me.role === "admin" && (
        <Link href="/admin" className="card flex items-center justify-between p-5 hover:bg-raised lg:hidden">
          <span><span className="block font-semibold">Админка</span><span className="text-[13px] text-muted">Участники, пароли, доступ</span></span>
          <span aria-hidden="true" className="text-muted">→</span>
        </Link>
      )}
      <form action={logout}><button className="w-full rounded-xl px-4 py-3 text-[14px] text-muted hover:bg-raised hover:text-ink">Выйти</button></form>
    </div>
  );
}
