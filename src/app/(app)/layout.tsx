import { Nav, Sidebar } from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <>
      <Sidebar isAdmin={me.role === "admin"} name={me.name} avatarUrl={me.avatarUrl} />
      <main className="mx-auto max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-28
        lg:ml-64 lg:mr-0 lg:max-w-none lg:px-10 lg:pt-10 lg:pb-12">
        <div className="lg:mx-auto lg:max-w-6xl">{children}</div>
      </main>
      <Nav isAdmin={me.role === "admin"} />
    </>
  );
}
