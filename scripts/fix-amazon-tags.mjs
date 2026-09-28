#!/usr/bin/env node
// Safely fixes Amazon.com affiliate tag parameters in data/posts.js.
// It does not replace placeholder ASINs, delete posts, or change amzn.to short links.
// Usage: node --env-file=.env.local scripts/fix-amazon-tags.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const OUT_DIR = path.join(ROOT, "outputs", "content-audits");
const EXPECTED_AMAZON_TAG = process.env.AMAZON_ASSOCIATE_TAG || "thecleancod02-20";

function todayStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function fixUrl(raw) {
  try {
    const url = new URL(raw);
    if (!/amazon\.com$/i.test(url.hostname) && !/\.amazon\.com$/i.test(url.hostname)) return raw;
    url.searchParams.set("tag", EXPECTED_AMAZON_TAG);
    return url.toString();
  } catch {
    return raw;
  }
}

const source = fs.readFileSync(POSTS_FILE, "utf8");
fs.mkdirSync(OUT_DIR, { recursive: true });

let fixed = 0;
let placeholderCount = 0;
let shortLinkCount = 0;

const updated = source.replace(/https:\/\/(?:www\.)?amazon\.com\/dp\/[A-Za-z0-9]+(?:\?[^"'\s]*)?/g, match => {
  if (/\/dp\/example/i.test(match)) placeholderCount++;
  const next = fixUrl(match);
  if (next !== match) fixed++;
  return next;
});

for (const _ of source.matchAll(/https?:\/\/amzn\.to\/[A-Za-z0-9]+/g)) shortLinkCount++;

if (updated !== source) {
  const backup = path.join(OUT_DIR, `posts-before-affiliate-fix-${todayStamp()}.js`);
  fs.writeFileSync(backup, source, "utf8");
  fs.writeFileSync(POSTS_FILE, updated, "utf8");
  console.log(`Updated Amazon tags in posts.js: ${fixed}`);
  console.log(`Backup written: ${backup}`);
} else {
  console.log("No Amazon tag changes needed.");
}

if (placeholderCount) {
  console.log(`Placeholder Amazon products still need manual replacement: ${placeholderCount}`);
}
if (shortLinkCount) {
  console.log(`amzn.to short links need manual attribution verification: ${shortLinkCount}`);
}
