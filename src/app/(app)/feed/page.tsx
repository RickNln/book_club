import { requireUser } from "@/lib/auth";
import { feedPage } from "@/lib/feed";
import { FeedList } from "@/components/Feed";

export default async function Feed() {
  const me = await requireUser();
  const first = await feedPage(me);
  return (
    <div className="mx-auto max-w-2xl space-y-4 lg:space-y-5">
      <header>
        <div className="label">Что запомнилось после чтения</div>
        <h1 className="font-display text-xl font-bold lg:text-3xl">Лента</h1>
      </header>
      <FeedList initial={first} />
    </div>
  );
}
