/**
 * Разовая загрузка смайликов клуба из папки emoji-seed/ (в git не попадает — лица участников).
 * Работает так же, как «Добавить смайлик» в админке: те же проверки (код, подпись до 30 символов,
 * PNG/WebP до 60 КБ, лимит 60) и тот же порядок — в конец набора.
 *
 *   npx tsx scripts/seed-emoji.ts             # группа — единственная в базе
 *   npx tsx scripts/seed-emoji.ts --group=1   # если групп несколько
 *
 * Код и подпись — имя файла без .png, порядок — по алфавиту. Повторный запуск дублей не создаёт:
 * смайлики с уже занятым кодом пропускаются.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { insertEmoji } from "../src/lib/emojiStore";

const DIR = "emoji-seed";

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--group="));
  const groups = await db().select().from(schema.groups).orderBy(asc(schema.groups.id));
  const group = arg ? groups.find((g) => g.id === Number(arg.split("=")[1])) : groups.length === 1 ? groups[0] : null;
  if (!group) throw new Error(`Укажите группу: --group=ID (есть: ${groups.map((g) => `${g.id} «${g.name}»`).join(", ")})`);
  const [admin] = await db().select({ id: schema.users.id, name: schema.users.name }).from(schema.users)
    .where(and(eq(schema.users.groupId, group.id), eq(schema.users.role, "admin"))).orderBy(asc(schema.users.id)).limit(1);

  const files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith(".png")).sort((a, b) => a.localeCompare(b, "en"));
  console.log(`Группа ${group.id} «${group.name}», автор — ${admin ? admin.name : "без автора"}; файлов: ${files.length}`);

  let added = 0, skipped = 0, failed = 0;
  for (const file of files) {
    const name = file.replace(/\.png$/i, "");
    const image = `data:image/png;base64,${(await readFile(join(DIR, file))).toString("base64")}`;
    const r = await insertEmoji(group.id, admin?.id ?? null, { code: name.toLowerCase(), label: name, image });
    if (r.ok) { added++; console.log(`  + ${name}`); }
    else if (r.duplicate) { skipped++; console.log(`  = ${name} — уже есть`); }
    else { failed++; console.log(`  ✗ ${name} — ${r.error}`); }
  }
  console.log(`Готово: добавлено ${added}, уже были ${skipped}, ошибок ${failed}`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
