import sharp from 'sharp';
import { readdir, stat, unlink } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = join(__dirname, '..', 'public', 'images');
const EXCLUDE_DIRS = ['logo']; // favicons y apple-touch-icons deben permanecer como PNG
const MAX_WIDTH = 1600;
const QUALITY = 82;

async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      files.push(...(await collectImages(fullPath)));
    } else if (['.jpg', '.jpeg', '.png'].includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function convertToWebp(filePath) {
  const sizeBefore = (await stat(filePath)).size;
  const outputPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  const metadata = await sharp(filePath).metadata();
  let pipeline = sharp(filePath);
  if (metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize(MAX_WIDTH);
  }

  await pipeline.webp({ quality: QUALITY }).toFile(outputPath);
  const sizeAfter = (await stat(outputPath)).size;
  await unlink(filePath);

  const pct = (((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(1);
  console.log(
    `✓ ${basename(filePath).padEnd(52)} ${String(Math.round(sizeBefore / 1024)).padStart(6)}KB → ${String(Math.round(sizeAfter / 1024)).padStart(5)}KB  (-${pct}%)`
  );
  return { sizeBefore, sizeAfter };
}

const files = await collectImages(INPUT_DIR);
console.log(`Convirtiendo ${files.length} imágenes a WebP (calidad ${QUALITY}, máx ${MAX_WIDTH}px)...\n`);

let totalBefore = 0;
let totalAfter = 0;
for (const file of files) {
  const { sizeBefore, sizeAfter } = await convertToWebp(file);
  totalBefore += sizeBefore;
  totalAfter += sizeAfter;
}

const pct = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1);
console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)} MB → ${(totalAfter / 1024 / 1024).toFixed(1)} MB  (-${pct}%)`);
