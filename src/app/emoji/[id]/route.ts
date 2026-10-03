import { currentUser } from "@/lib/auth";
import { emojiOfGroup } from "@/lib/emojiStore";

/**
 * Картинка смайлика клуба. В ленту шлём только id, картинку браузер берёт отсюда и кэширует:
 * картинка смайлика не меняется (только подпись), id не переиспользуются. Лица участников —
 * поэтому только своей группе и с private-кэшем.
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return new Response("Нужно войти", { status: 401 });
  const emoji = await emojiOfGroup(me.groupId, Number(params.id));
  const m = emoji && /^data:(image\/(?:png|webp));base64,(.+)$/.exec(emoji.image);
  if (!m) return new Response("Нет такого смайлика", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
