/**
 * compress-images.js
 * Resizes and re-encodes all JPGs in assets/images/ to web-optimised sizes.
 * Card images → max 1200px wide, quality 82
 * Portrait image → max 960px wide, quality 85
 * Run once: node compress-images.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR  = path.join(__dirname, '../assets/images');
const BACKUP_DIR = path.join(__dirname, '../assets/images/_originals');
const OUT_DIR    = path.join(__dirname, '../assets/images/_compressed');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f));

async function processImage(file) {
  const src = path.join(INPUT_DIR, file);
  const backup = path.join(BACKUP_DIR, file);
  const tmp = src + '.tmp';

  // Backup original if not already done
  if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);

  const meta = await sharp(src).metadata();
  const originalKB = Math.round(fs.statSync(src).size / 1024);

  const maxW = file.includes('natalie-kinnear') ? 960 : 1600;
  const quality = 82;

  const outPath = path.join(OUT_DIR, file);
  const outBuf = await sharp(src)
    .resize({ width: maxW, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  const newKB = Math.round(outBuf.length / 1024);
  fs.writeFileSync(outPath, outBuf);

  console.log(`${file}: ${originalKB}KB → ${newKB}KB (${Math.round((1 - newKB/originalKB)*100)}% smaller)`);
}

(async () => {
  console.log(`Processing ${files.length} images...\n`);
  for (const file of files) {
    try {
      await processImage(file);
    } catch (e) {
      console.error(`Failed: ${file}`, e.message);
    }
  }
  console.log(`\nDone. Compressed files written to assets/images/_compressed/`);
  console.log('Stop the server, then run: node compress-images.js --apply to overwrite originals.');

  // --apply flag: overwrite originals when server is stopped
  if (process.argv.includes('--apply')) {
    console.log('\nApplying compressed files...');
    const compFiles = fs.readdirSync(OUT_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f));
    for (const file of compFiles) {
      fs.copyFileSync(path.join(OUT_DIR, file), path.join(INPUT_DIR, file));
      console.log(`  applied: ${file}`);
    }
    fs.rmSync(OUT_DIR, { recursive: true });
    console.log('All done.');
  }
})();
