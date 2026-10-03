import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { dayInTz } from "../src/lib/dates";

async function main() {
  const login = (process.env.ADMIN_LOGIN || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Задайте ADMIN_PASSWORD в .env");

  let [group] = await db().select().from(schema.groups);
  if (!group) [group] = await db().insert(schema.groups).values({ name: "Книга на ночь" }).returning();

  const [habit] = await db().select().from(schema.habits).where(eq(schema.habits.groupId, group.id));
  if (!habit) {
    await db().insert(schema.habits).values({
      groupId: group.id, slug: "reading", name: "Чтение перед сном",
      targetMinutes: 20, minMinutes: 5, freezesPerWeek: 1,
      fields: [{ key: "itemId", type: "item", label: "Книга" }, { key: "pages", type: "number", label: "Страниц" }],
      startedOn: dayInTz(),
    });
  }

  const [admin] = await db().select().from(schema.users).where(eq(schema.users.login, login));
  if (!admin) {
    await db().insert(schema.users).values({
      groupId: group.id, name: process.env.ADMIN_NAME || "Админ", login,
      passwordHash: await bcrypt.hash(password, 10), role: "admin",
    });
    console.log(`Админ создан: ${login}`);
  } else {
    console.log(`Админ ${login} уже есть`);
  }
  console.log("Готово");
}
main().catch((e) => { console.error(e); process.exit(1); });
