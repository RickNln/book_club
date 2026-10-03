import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await currentUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="h-14 w-14 rounded-[14px]" />
      <h1 className="mt-6 font-display text-3xl font-bold leading-tight">Книга на ночь</h1>
      <p className="mt-2 text-muted">20 минут книги перед сном. Логин и пароль выдаёт админ.</p>
      <div className="mt-8"><LoginForm /></div>
    </main>
  );
}
