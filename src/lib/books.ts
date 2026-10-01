import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";

/** Книгу правит владелец или админ той же группы. */
export async function editableBook(me: User, id: number) {
  const [row] = await db().select({ book: schema.items, ownerGroup: schema.users.groupId, ownerName: schema.users.name })
    .from(schema.items)
    .innerJoin(schema.users, eq(schema.users.id, schema.items.userId))
    .where(eq(schema.items.id, id));
  if (!row) return null;
  const allowed = row.book.userId === me.id || (me.role === "admin" && row.ownerGroup === me.groupId);
  return allowed ? { ...row.book, ownerName: row.ownerName } : null;
}

/** Ссылка http(s) или картинка, загруженная и сжатая в браузере (data URL до ~300 КБ). */
export function cleanCover(v: string): string | null {
  if (!v) return null;
  if (/^https?:\/\/\S+$/.test(v) && v.length < 2000) return v;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 400_000) return v;
  return null;
}
