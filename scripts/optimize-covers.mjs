#!/usr/bin/env node
// Convert heavy PNG post covers (~2 MB each) to web-sized JPEGs (~150–250 KB) and repoint posts.js.
//
//   node scripts/optimize-covers.mjs            # dry run: list what would change
//   node scripts/optimize-covers.mjs --apply    # convert, update data/posts.js (validated), remove the PNGs
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const PYTHON = process.env.IMAGE_PYTHON || "E:/AI/ComfyUI/.venv/Scripts/python.exe";
const CONVERTER = path.join(ROOT, "scripts/lib/to_jpeg.py");
const MIN_BYTES = 400_000;
const apply = process.argv.includes("--apply");

async function importPosts(source) {
  const tmp = path.join(os.tmpdir(), `tcc-optimize-${randomUUID()}.mjs`);
  fs.writeFileSync(tmp, source);
  try {
    return (await import(pathToFileURL(tmp).href)).posts;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

export function convertToJpeg(src, dest) {
  execFileSync(PYTHON, [CONVERTER, src, dest], { stdio: "pipe", windowsHide: true });
}

if (process.argv[1]?.endsWith("optimize-covers.mjs")) {
  let source = fs.readFileSync(POSTS_FILE, "utf8");
  const posts = await importPosts(source);
  // Targets: .png covers, and ".jpg" covers that are really PNG bytes (old DALL-E downloads, ~2.2 MB each).
  const isPngBytes = (file) => { const b = fs.readFileSync(file).subarray(0, 4); return b[0] === 0x89 && b[1] === 0x50; };
  const targets = posts.filter((p) => {
    const file = path.join(ROOT, "public", p.cover || "");
    if (!p.cover || !fs.existsSync(file) || fs.statSync(file).size < MIN_BYTES) return false;
    return /\.png$/i.test(p.cover) || isPngBytes(file);
  });

  let before = 0, after = 0;
  const converted = [];
  for (const post of targets) {
    const src = path.join(ROOT, "public", post.cover);
    const jpgRel = post.cover.replace(/\.png$/i, ".jpg");
    const jpg = path.join(ROOT, "public", jpgRel);
    before += fs.statSync(src).size;
    if (!apply) continue;
    if (src === jpg) {
      // Misnamed PNG: convert via a temp file, then replace in place (same URL, no posts.js change).
      const tmp = jpg + ".tmp.jpg";
      convertToJpeg(src, tmp);
      fs.renameSync(tmp, jpg);
    } else {
      convertToJpeg(src, jpg);
      source = source.replace(`cover: "${post.cover}"`, `cover: "${jpgRel}"`);
      converted.push({ post, png: src, jpgRel });
    }
    after += fs.statSync(jpg).size;
  }
  if (apply) console.log(`Re-encoded ${targets.length - converted.length} misnamed PNG ".jpg" covers in place.`);

  if (apply) {
    if (converted.length) {
      const updated = await importPosts(source); // never write a posts.js that won't load
      for (const { post, jpgRel } of converted)
        if (updated.find((p) => p.slug === post.slug)?.cover !== jpgRel) throw new Error(`${post.slug} cover did not update`);
      fs.writeFileSync(POSTS_FILE, source, "utf8");
      for (const { png } of converted) fs.rmSync(png);
    }
    console.log(`Optimized ${targets.length} covers (${converted.length} repointed .png -> .jpg): ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
  } else {
    console.log(`${targets.length} heavy PNG-encoded covers (${(before / 1e6).toFixed(1)} MB). Run with --apply.`);
  }
}
