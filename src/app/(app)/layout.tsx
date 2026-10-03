import { Nav, Sidebar } from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { unreadCount } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const unread = await unreadCount(me);
  return (
    <>
      <Sidebar isAdmin={me.role === "admin"} name={me.name} avatarUrl={me.avatarUrl} unread={unread} />
      <main className="mx-auto max-w-lg pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]
        pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+7rem)]
        lg:ml-64 lg:mr-0 lg:max-w-none lg:px-10 lg:pt-10 lg:pb-12">
        <div className="lg:mx-auto lg:max-w-6xl">{children}</div>
      </main>
      <Nav unread={unread} />
    </>
  );
}
