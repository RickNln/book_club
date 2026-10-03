import { requireUser } from "@/lib/auth";
import { AvatarForm, PasswordForm } from "@/components/forms";
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
      <form action={logout}><button className="w-full rounded-xl px-4 py-3 text-[14px] text-muted hover:bg-raised hover:text-ink">Выйти</button></form>
    </div>
  );
}
