// Export platform sizes from the approved artwork without redesigning it.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../public/branding/ibq-icon-approved.png", import.meta.url);
const root = new URL("../", import.meta.url);
await mkdir(new URL("public/icons/", root), { recursive: true });
const sizes = [16, 32, 48, 180, 192, 512];
const images = new Map(await Promise.all(sizes.map(async size => [size,
  await sharp(fileURLToPath(source)).resize(size, size).ensureAlpha().png().toBuffer(),
])));
await Promise.all([
  writeFile(new URL("src/app/apple-icon.png", root), images.get(180)),
  writeFile(new URL("src/app/icon.png", root), images.get(192)),
  writeFile(new URL("public/icons/ibq-home-v2-192.png", root), images.get(192)),
  writeFile(new URL("public/icons/ibq-home-v2-512.png", root), images.get(512)),
]);

// ICO container with PNG frames, supported by modern browsers and Windows.
const frameSizes = [16, 32, 48];
const header = Buffer.alloc(6 + frameSizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frameSizes.length, 4);
let offset = header.length;
for (const [index, size] of frameSizes.entries()) {
  const frame = images.get(size);
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
}
await writeFile(new URL("src/app/favicon.ico", root), Buffer.concat([header, ...frameSizes.map(size => images.get(size))]));
console.log("Exported approved IBQ icon: favicon, Apple touch icon, and 192/512px home-screen icons.");
