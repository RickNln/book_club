import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { groupEmoji } from "@/lib/emojiStore";
import { EmojiAdmin } from "@/components/EmojiAdmin";

export default async function EmojiAdminPage() {
  const me = await requireAdmin();
  const list = await groupEmoji(me.groupId);
  const used = await db().select({ id: schema.reactions.emojiId, n: count() }).from(schema.reactions)
    .innerJoin(schema.customEmoji, eq(schema.customEmoji.id, schema.reactions.emojiId))
    .where(eq(schema.customEmoji.groupId, me.groupId))
    .groupBy(schema.reactions.emojiId);
  return (
    <div className="space-y-4 lg:space-y-5">
      <header>
        <Link href="/admin" className="text-[13px] text-teal">← Админка</Link>
        <h1 className="mt-1 font-display text-xl font-bold lg:text-3xl">Смайлики клуба</h1>
        <p className="label mt-1">Реакции в ленте — лица участников с эмоциями. Смайлик, которым уже реагировали, можно только скрыть.</p>
      </header>
      <EmojiAdmin emoji={list.map((e) => ({
        id: e.id, code: e.code, label: e.label, hidden: e.isHidden,
        used: Number(used.find((u) => u.id === e.id)?.n ?? 0),
      }))} />
    </div>
  );
}
