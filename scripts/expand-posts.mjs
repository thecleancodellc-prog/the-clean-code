#!/usr/bin/env node
// Batch-expand thin posts to real article length using the same expandToLength() step as Scribe.
//
//   node --env-file=.env.local scripts/expand-posts.mjs                # expand drafts -> outputs/expansions/ (resumable)
//   node --env-file=.env.local scripts/expand-posts.mjs --limit=10     # only the next 10
//   node --env-file=.env.local scripts/expand-posts.mjs --apply        # write finished drafts into data/posts.js
//
// Drafts are saved per post, so an interrupted run resumes where it stopped. --apply validates posts.js
// (imports cleanly, same post count, every applied post actually updated) before writing anything.
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { expandToLength, countWords } from "./lib/expand.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const DRAFT_DIR = path.join(ROOT, "outputs/expansions");
const THIN = 900;
const MIN_OK = 1000;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || Infinity);
const only = args.find((a) => a.startsWith("--slug="))?.split("=")[1] || "";

async function importPosts(source) {
  const tmp = path.join(os.tmpdir(), `tcc-expand-${randomUUID()}.mjs`);
  fs.writeFileSync(tmp, source);
  try {
    return (await import(pathToFileURL(tmp).href)).posts;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const escTemplate = (s) => String(s).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

// Index of the closing backtick of the template literal that opens just before `from` (skips escapes).
// Searching for "`," is wrong: when content is an entry's last field its closing backtick has no comma,
// and the search runs into the following posts.
export function templateEnd(source, from) {
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\") { i++; continue; }
    if (source[i] === "`") return i;
  }
  return -1;
}

function replaceContent(source, slug, content) {
  const slugAt = source.indexOf(`slug: "${slug}"`);
  if (slugAt === -1) throw new Error(`slug not found: ${slug}`);
  const start = source.indexOf("content: `", slugAt);
  const end = start === -1 ? -1 : templateEnd(source, start + 10);
  if (start === -1 || end === -1) throw new Error(`content not found: ${slug}`);
  return source.slice(0, start) + `content: \`\n${escTemplate(content)}\n  ` + source.slice(end);
}

let source = fs.readFileSync(POSTS_FILE, "utf8");
const posts = await importPosts(source);
fs.mkdirSync(DRAFT_DIR, { recursive: true });
const draftPath = (slug) => path.join(DRAFT_DIR, `${slug}.json`);

if (apply) {
  const drafts = posts.filter((p) => (!only || p.slug === only) && fs.existsSync(draftPath(p.slug)));
  for (const p of drafts) source = replaceContent(source, p.slug, JSON.parse(fs.readFileSync(draftPath(p.slug), "utf8")).content);
  const after = await importPosts(source);
  if (after.length !== posts.length) throw new Error(`post count changed: ${posts.length} -> ${after.length}`);
  for (const p of drafts) {
    if (countWords(after.find((x) => x.slug === p.slug).content) < MIN_OK) throw new Error(`${p.slug} did not update`);
  }
  fs.copyFileSync(POSTS_FILE, path.join(ROOT, "outputs/backups", `posts-before-expansion-${Date.now()}.js`));
  fs.writeFileSync(POSTS_FILE, source, "utf8");
  console.log(`[expand] Applied ${drafts.length} expanded posts to data/posts.js`);
  process.exit(0);
}

// Oldest first: they've been indexed longest, so their quality matters most for search.
const queue = posts
  .filter((p) => (only ? p.slug === only : countWords(p.content) < THIN) && !fs.existsSync(draftPath(p.slug)))
  .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  .slice(0, limit);

console.log(`[expand] ${queue.length} thin posts to expand (${posts.filter((p) => fs.existsSync(draftPath(p.slug))).length} already drafted)`);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let done = 0, failed = 0;
for (const post of queue) {
  const before = countWords(post.content);
  try {
    const content = await expandToLength(client, post, { minWords: MIN_OK, targetWords: 1300, rounds: 2, agent: "expand" });
    const after = countWords(content);
    if (after < MIN_OK) throw new Error(`only reached ${after} words`);
    fs.writeFileSync(draftPath(post.slug), JSON.stringify({ slug: post.slug, before, after, content }, null, 2));
    done++;
    console.log(`[expand] ${done}/${queue.length} ${post.slug}: ${before} -> ${after} words`);
  } catch (err) {
    failed++;
    console.error(`[expand] ${post.slug}: FAILED — ${err.message}`);
  }
}
console.log(`[expand] Done: ${done} drafted, ${failed} failed. Review outputs/expansions/, then run with --apply.`);
