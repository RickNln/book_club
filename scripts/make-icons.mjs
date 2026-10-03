/**
 * Разовая генерация PNG-иконок из public/icon.svg — iPhone не берёт SVG для экрана «Домой».
 * В сборку не встроено: PNG лежат в public/ и коммитятся. Запускать вручную при смене логотипа:
 *
 *   npm i --no-save sharp && node scripts/make-icons.mjs
 *
 * Фон в PNG заливается до краёв (без скругления): iOS и Android скругляют иконку сами,
 * а прозрачные углы на экране «Домой» стали бы чёрными.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = (await readFile("public/icon.svg", "utf8")).replace(/<rect([^>]*?) rx="\d+"/, "<rect$1");

for (const [file, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  const png = await sharp(Buffer.from(svg), { density: Math.ceil((72 * size) / 512) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(`public/${file}`, png);
  console.log(`public/${file}  ${size}×${size}  ${png.length} байт`);
}
