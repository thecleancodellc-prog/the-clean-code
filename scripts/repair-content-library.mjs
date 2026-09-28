#!/usr/bin/env node
// Repairs The Clean Code post library without deleting content blindly.
// - backs up data/posts.js
// - fixes known missing/fallback cover paths to jpg
// - removes exact duplicate slug blocks, keeping the more topic-relevant version
// - archives removed duplicate blocks to outputs/content-audits

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const OUT_DIR = path.join(ROOT, "outputs", "content-audits");

const COVER_REPAIRS = new Map([
  ["5-non-toxic-swaps-for-your-bathroom", "/images/5-non-toxic-swaps-for-your-bathroom.jpg"],
  ["safe-sustainable-food-storage-beyond-plastic-alternatives", "/images/safe-sustainable-food-storage-beyond-plastic-alternatives.jpg"],
  ["zero-waste-party-planning", "/images/zero-waste-party-planning.jpg"],
  ["eco-conscious-holiday-travel-tips", "/images/eco-conscious-holiday-travel-tips.jpg"],
  ["zero-waste-bathroom-transition", "/images/zero-waste-bathroom-transition.jpg"],
  ["eco-friendly-pest-deterrents-plant-only-garden", "/images/eco-friendly-pest-deterrents-plant-only-garden.jpg"]
]);

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return stripHtml(value).split(/\s+/).filter(Boolean);
}

function getString(block, key) {
  const re = new RegExp(key + "\\s*:\\s*[\"']([^\"']+)[\"']");
  return block.match(re)?.[1] || "";
}

function getTemplateField(block, key) {
  const idx = block.indexOf(key + ":");
  if (idx === -1) return "";
  const tick = block.indexOf("`", idx);
  if (tick === -1) return "";
  let escaped = false;
  for (let i = tick + 1; i < block.length; i++) {
    const ch = block[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "`") return block.slice(tick + 1, i);
  }
  return "";
}

function extractPostBlocks(source) {
  const arrStart = source.indexOf("export const posts");
  const bracketStart = source.indexOf("[", arrStart);
  const blocks = [];
  let depth = 0;
  let start = -1;
  let inString = null;
  let inTemplate = false;
  let escaped = false;
  let end = -1;

  for (let i = bracketStart + 1; i < source.length; i++) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if ((inString || inTemplate) && ch === "\\") {
      escaped = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (ch === "`") inTemplate = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        blocks.push(source.slice(start, i + 1));
        start = -1;
      }
      continue;
    }
    if (depth === 0 && ch === "]") {
      end = i;
      break;
    }
  }
  return { header: source.slice(0, bracketStart + 1), blocks, tail: source.slice(end) };
}

function topicTerms(slug, title) {
  return new Set((slug + " " + title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(term => term.length > 3 && !["with", "from", "your", "home", "guide", "without", "room", "ways"].includes(term)));
}

function postInfo(block, index) {
  const slug = getString(block, "slug");
  const title = getString(block, "title");
  const content = getTemplateField(block, "content");
  const product = block.match(/product\s*:\s*\{([\s\S]*?)\n\s*\},\n\s*content\s*:/)?.[1] || "";
  const plain = stripHtml(content);
  const terms = topicTerms(slug, title);
  const productText = product.toLowerCase();
  const contentText = plain.toLowerCase();
  let productHits = 0;
  let contentHits = 0;
  for (const term of terms) {
    if (productText.includes(term)) productHits++;
    if (contentText.includes(term)) contentHits++;
  }
  const wordCount = words(plain).length;
  const relevanceScore = productHits * 20 + contentHits * 2 + Math.min(wordCount, 1200) / 1000;
  return { index, slug, title, wordCount, productHits, contentHits, relevanceScore };
}

function repairCover(block, slug) {
  const cover = COVER_REPAIRS.get(slug);
  if (!cover) return block;
  if (/cover\s*:\s*undefined/.test(block)) {
    return block.replace(/cover\s*:\s*undefined/, `cover: "${cover}"`);
  }
  if (/cover\s*:\s*["'][^"']+["']/.test(block)) {
    return block.replace(/cover\s*:\s*["'][^"']+["']/, `cover: "${cover}"`);
  }
  return block.replace(/author\s*:\s*\{[^}]+\},/, match => `${match}\n  cover: "${cover}",`);
}

const source = fs.readFileSync(POSTS_FILE, "utf8").replace(/^\uFEFF/, "");
fs.mkdirSync(OUT_DIR, { recursive: true });
const backupPath = path.join(OUT_DIR, `posts-before-content-library-repair-${stamp()}.js`);
fs.writeFileSync(backupPath, source, "utf8");

const parsed = extractPostBlocks(source);
const infos = parsed.blocks.map(postInfo);
const bySlug = new Map();
for (const info of infos) {
  if (!bySlug.has(info.slug)) bySlug.set(info.slug, []);
  bySlug.get(info.slug).push(info);
}

const removeIndexes = new Set();
const archived = [];
for (const [slug, group] of bySlug) {
  if (group.length < 2) continue;
  const sorted = group.slice().sort((a, b) => b.relevanceScore - a.relevanceScore || b.wordCount - a.wordCount || a.index - b.index);
  const keep = sorted[0];
  for (const info of sorted.slice(1)) {
    removeIndexes.add(info.index);
    archived.push({ slug, kept: keep, removed: info, removedBlock: parsed.blocks[info.index] });
  }
}

const repairedBlocks = [];
let coverRepairs = 0;
for (const info of infos) {
  if (removeIndexes.has(info.index)) continue;
  const block = parsed.blocks[info.index];
  const repaired = repairCover(block, info.slug);
  if (repaired !== block) coverRepairs++;
  repairedBlocks.push(repaired);
}

const next = `${parsed.header}\n  ${repairedBlocks.join(",\n\n  ")}\n];\n`;
fs.writeFileSync(POSTS_FILE, next, "utf8");
const archivePath = path.join(OUT_DIR, `archived-duplicate-posts-${stamp()}.json`);
fs.writeFileSync(archivePath, JSON.stringify({ generatedAt: new Date().toISOString(), archived }, null, 2), "utf8");

console.log(`Backup written: ${backupPath}`);
console.log(`Duplicate post blocks archived: ${archived.length}`);
console.log(`Archive written: ${archivePath}`);
console.log(`Cover paths repaired in posts.js: ${coverRepairs}`);