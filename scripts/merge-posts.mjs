#!/usr/bin/env node
// Merge repeated-topic posts into one stronger post and 301-redirect the removed slugs.
//
//   node --env-file=.env.local scripts/merge-posts.mjs            # dry run: writes drafts to outputs/merges/
//   node --env-file=.env.local scripts/merge-posts.mjs --apply    # also rewrites data/posts.js + redirects
//
// The keeper keeps its slug, date, cover, and product; the merged article replaces its title/excerpt/seo/content.
// Redirects are written to data/redirects.json and loaded by next.config.mjs (permanent 308s).
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath, pathToFileURL } from "url";
import { SYSTEM_PROMPT } from "./agents/scribe.mjs";
import { expandToLength } from "./lib/expand.mjs";

function templateEnd(source, from) {
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\") { i++; continue; }
    if (source[i] === "`") return i;
  }
  return -1;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const REDIRECTS_FILE = path.join(ROOT, "data/redirects.json");
const DRAFT_DIR = path.join(ROOT, "outputs/merges");
const MIN_WORDS = 1000;

// Keeper first. Chosen as the post that was live longest (the rest were never deployed or are newer).
const GROUPS = [
  ["green-home-gym-ideas", "affordable-non-toxic-home-gym", "non-toxic-home-gym-safe-equipment-flooring"],
  ["hidden-laundry-toxins", "hidden-laundry-toxins-mini"],
  ["non-toxic-nursery-guide", "non-toxic-baby-nursery-guide"],
  ["minimalist-eco-friendly-bathroom-transition", "zero-waste-bathroom-transition"],
  ["eco-friendly-home-electronics", "transition-greener-home-electronics-guide"],
];

const apply = process.argv.includes("--apply");
const words = (html) => String(html).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

async function importPosts(source) {
  const tmp = path.join(os.tmpdir(), `tcc-merge-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmp, source);
  try {
    return (await import(pathToFileURL(tmp).href)).posts;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

async function writeMerged(client, group) {
  const sources = group.map((p, i) =>
    `SOURCE ${i + 1}: "${p.title}"\n${String(p.content).replace(/<!--[\s\S]*?-->/g, "").replace(/<div class="my-8">[\s\S]*?<\/div>/g, "")}`
  ).join("\n\n");
  const keeper = group[0];

  {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `These ${group.length} posts on our blog cover the same subject. Merge them into ONE definitive, detailed article.

- Keep every useful, specific fact, tip, and section from all sources; remove repetition.
- Organize it logically with clear <h2> sections; add depth where the sources are thin (practical steps, what to look for, common mistakes).
- It MUST be at least 1,100 words of body text (aim for 1,200–1,500). Short answers are rejected.
- Keep the subject of "${keeper.title}" as the focus; you may improve the title.
- Include exactly 3 ad blocks as specified.
- Return only JSON with title, excerpt, categories, featured, seo, content.

${sources}`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const merged = JSON.parse(res.choices[0].message.content);
    console.log(`[merge] ${keeper.slug}: first draft ${words(merged.content)} words`);
    merged.content = await expandToLength(client, merged, { minWords: MIN_WORDS, rounds: 3, agent: "merge" });
    const count = words(merged.content);
    const ads = (String(merged.content).match(/adsbygoogle/g) || []).length;
    console.log(`[merge] ${keeper.slug}: final ${count} words, ${ads} ad blocks`);
    if (count >= MIN_WORDS && ads === 3) return merged;
  }
  throw new Error(`${keeper.slug}: merged article stayed under ${MIN_WORDS} words or had the wrong ad count`);
}

// Locate one post object in the source text: from the "{" line before its slug to the "}," after its content.
function blockRange(source, slug) {
  const slugAt = source.indexOf(`slug: "${slug}"`);
  if (slugAt === -1) throw new Error(`slug not found: ${slug}`);
  const start = source.lastIndexOf("{", slugAt);
  const contentAt = source.indexOf("content: `", slugAt);
  const contentEnd = templateEnd(source, contentAt + 10); // real closing backtick, not the next "`,"
  const close = source.indexOf("}", contentEnd);
  let end = close + 1;
  if (source[end] === ",") end++;
  const lineStart = source.lastIndexOf("\n", start) + 1;
  return [lineStart, end];
}

const esc = (s) => JSON.stringify(String(s ?? ""));
const escTemplate = (s) => String(s).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

function replaceFields(block, merged) {
  const seo = merged.seo || {};
  return block
    .replace(/^(\s*)title: "(?:[^"\\]|\\.)*",/m, `$1title: ${esc(merged.title)},`)
    .replace(/excerpt:\s*\n?\s*"(?:[^"\\]|\\.)*",/, `excerpt:\n    ${esc(merged.excerpt)},`)
    .replace(/seo: \{[\s\S]*?\n\s*\},/, `seo: {\n    keywords: [${(seo.keywords || []).map(esc).join(", ")}],\n    metaTitle: ${esc(seo.metaTitle)},\n    metaDescription:\n      ${esc(seo.metaDescription)},\n  },`)
    .replace(/content: `(?:\\[\s\S]|[^`\\])*`/, () => `content: \`\n${escTemplate(merged.content)}\n  \``);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let source = fs.readFileSync(POSTS_FILE, "utf8");
const posts = await importPosts(source);
const bySlug = new Map(posts.map((p) => [p.slug, p]));
const redirects = fs.existsSync(REDIRECTS_FILE) ? JSON.parse(fs.readFileSync(REDIRECTS_FILE, "utf8")) : [];
fs.mkdirSync(DRAFT_DIR, { recursive: true });

for (const slugs of GROUPS) {
  const group = slugs.map((s) => bySlug.get(s) || (() => { throw new Error(`missing post ${s}`); })());
  const draftFile = path.join(DRAFT_DIR, `${slugs[0]}.json`);
  const merged = fs.existsSync(draftFile) ? JSON.parse(fs.readFileSync(draftFile, "utf8")) : await writeMerged(client, group);
  fs.writeFileSync(draftFile, JSON.stringify(merged, null, 2));
  console.log(`[merge] ${slugs[0]}: "${merged.title}" (${words(merged.content)} words) <- ${slugs.slice(1).join(", ")}`);
  if (!apply) continue;

  const [ks, ke] = blockRange(source, slugs[0]);
  source = source.slice(0, ks) + replaceFields(source.slice(ks, ke), merged) + source.slice(ke);
  for (const loser of slugs.slice(1)) {
    const [ls, le] = blockRange(source, loser);
    source = source.slice(0, ls) + source.slice(le).replace(/^\s*\n/, "");
    redirects.push({ source: `/blog/${loser}`, destination: `/blog/${slugs[0]}`, permanent: true });
  }
}

if (apply) {
  const after = await importPosts(source); // throws on syntax error: never write a build-breaking posts.js
  const removed = GROUPS.flatMap((g) => g.slice(1));
  if (after.length !== posts.length - removed.length) throw new Error(`expected ${posts.length - removed.length} posts, got ${after.length}`);
  if (removed.some((s) => after.find((p) => p.slug === s))) throw new Error("a merged-away post is still present");
  for (const g of GROUPS) if (words(after.find((p) => p.slug === g[0]).content) < MIN_WORDS) throw new Error(`${g[0]} content did not update`);
  fs.writeFileSync(POSTS_FILE, source, "utf8");
  const unique = [...new Map(redirects.map((r) => [r.source, r])).values()];
  fs.writeFileSync(REDIRECTS_FILE, JSON.stringify(unique, null, 2) + "\n");
  console.log(`[merge] Applied: ${posts.length} -> ${after.length} posts, ${unique.length} redirects in data/redirects.json`);
} else {
  console.log(`[merge] Dry run done. Drafts in outputs/merges/. Rerun with --apply to update the site.`);
}
