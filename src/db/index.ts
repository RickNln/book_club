import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

/** Подключение создаётся при первом запросе, чтобы сборка не требовала DATABASE_URL. */
export function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL не задан. Подключите Neon в Vercel или пропишите в .env");
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}
export { schema };
