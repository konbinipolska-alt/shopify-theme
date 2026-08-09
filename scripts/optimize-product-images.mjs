import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RAW = '/private/tmp/claude-501/-Users-konbinipolska-Projects-scratch/6a401d43-fd77-4678-bc00-36230c4690af/scratchpad/photos/raw';
const OPT = '/private/tmp/claude-501/-Users-konbinipolska-Projects-scratch/6a401d43-fd77-4678-bc00-36230c4690af/scratchpad/photos/opt';
const TARGET = 256000; // ~250 KB
const MIN_QUALITY = 60;

const files = (await readdir(RAW)).filter((f) => f.endsWith('.jpg')).sort();
const report = [];

for (const file of files) {
  const src = path.join(RAW, file);
  const dst = path.join(OPT, file);
  const before = (await stat(src)).size;

  // Walk quality down until the encoded buffer fits the target.
  let chosen = null;
  for (let q = 92; q >= MIN_QUALITY; q -= 2) {
    const buf = await sharp(src)
      .jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:4:4', trellisQuantisation: true })
      .toBuffer();
    if (buf.length <= TARGET || q === MIN_QUALITY) {
      chosen = { q, buf };
      break;
    }
  }

  await writeFile(dst, chosen.buf);
  report.push({
    sku: path.basename(file, '.jpg'),
    quality: chosen.q,
    beforeKB: Math.round(before / 1024),
    afterKB: Math.round(chosen.buf.length / 1024),
    saved: `${Math.round((1 - chosen.buf.length / before) * 100)}%`,
  });
}

console.table(report);
const totalBefore = report.reduce((a, r) => a + r.beforeKB, 0);
const totalAfter = report.reduce((a, r) => a + r.afterKB, 0);
console.log(`\ntotal: ${(totalBefore / 1024).toFixed(1)} MB -> ${(totalAfter / 1024).toFixed(1)} MB`);
