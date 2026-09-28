#!/usr/bin/env node
// Content Optimizer - audits The Clean Code posts for duplicate, thin, visual, and monetization issues.
// Usage: node --env-file=.env.local scripts/content-optimizer.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const PUBLIC_DIR = path.join(ROOT, "public");
const OUT_DIR = path.join(ROOT, "outputs", "content-audits");
const EXPECTED_AMAZON_TAG = process.env.AMAZON_ASSOCIATE_TAG || "thecleancod02-20";
const OLD_POST_DAYS = Number(process.env.OPTIMIZER_OLD_POST_DAYS || 120);

const STOPWORDS = new Set("the and for with that this from your you are was were will home clean green eco friendly sustainable non toxic natural guide tips into about have has can not but they their our out use using how why what when where safe simple better".split(" "));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(w => w.replace(/^-|-$/g, ""))
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function getString(block, key) {
  const re = new RegExp(key + "\\s*:\\s*[\"']([^\"']+)[\"']");
  return block.match(re)?.[1] || "";
}

function getLooseField(block, key) {
  const quoted = getString(block, key);
  if (quoted) return quoted;
  const re = new RegExp(key + "\\s*:\\s*([^,\\n]+)");
  return (block.match(re)?.[1] || "").trim();
}

function getCategories(block) {
  const raw = block.match(/categories\s*:\s*\[([\s\S]*?)\]/)?.[1] || "";
  return [...raw.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
}

function getAffiliateUrls(block) {
  return [...block.matchAll(/affiliateUrl\s*:\s*["']([^"']+)["']/g)].map(m => m[1]);
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
    if (depth === 0 && ch === "]") break;
  }
  return blocks;
}

function coverStatus(cover) {
  if (!cover || cover === "undefined" || cover === "null") {
    return { status: "missing", reason: "no cover field" };
  }
  if (/^https?:\/\//i.test(cover)) {
    return { status: "external", reason: "external image URL" };
  }
  const normalized = cover.replace(/^\/+/, "");
  const abs = path.join(PUBLIC_DIR, normalized);
  if (!fs.existsSync(abs)) {
    return { status: "missing", reason: "cover file not found", abs };
  }
  const ext = path.extname(abs).toLowerCase();
  const stat = fs.statSync(abs);
  if (ext === ".svg") {
    return { status: "fallback", reason: "local SVG fallback cover", abs, bytes: stat.size };
  }
  if (stat.size < 20_000) {
    return { status: "weak", reason: "cover file is unusually small", abs, bytes: stat.size };
  }
  return { status: "ok", reason: "cover found", abs, bytes: stat.size };
}

function daysOld(dateValue) {
  const time = Date.parse(dateValue);
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / 86_400_000);
}

function parsePosts() {
  const source = fs.readFileSync(POSTS_FILE, "utf8");
  return extractPostBlocks(source).map((block, index) => {
    const content = getTemplateField(block, "content");
    const plain = stripHtml(content);
    const title = getString(block, "title");
    const slug = getString(block, "slug") || "post-" + index;
    const cover = getLooseField(block, "cover").replace(/^["']|["']$/g, "");
    const tokenList = words(title + " " + plain);
    return {
      index,
      slug,
      title,
      date: getString(block, "date"),
      cover,
      categories: getCategories(block),
      metaTitle: block.match(/metaTitle\s*:\s*["']([^"']+)["']/)?.[1] || "",
      metaDescription: block.match(/metaDescription\s*:\s*["']([^"']+)["']/)?.[1] || "",
      affiliateUrls: getAffiliateUrls(block),
      wordCount: plain.split(/\s+/).filter(Boolean).length,
      tokenList,
      tokenSet: new Set(tokenList),
      plain,
      coverStatus: coverStatus(cover),
      daysOld: daysOld(getString(block, "date"))
    };
  });
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap++;
  return overlap / (a.size + b.size - overlap);
}

function repeatedPhrases(post, size = 4) {
  const tokens = words(post.plain);
  const counts = new Map();
  for (let i = 0; i <= tokens.length - size; i++) {
    const phrase = tokens.slice(i, i + size).join(" ");
    if (phrase.length < 18) continue;
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([phrase, count]) => ({ phrase, count }));
}

function amazonTag(url) {
  try {
    return new URL(url).searchParams.get("tag") || "";
  } catch {
    return "";
  }
}

function audit(posts) {
  const duplicatePairs = [];
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const sameSlug = posts[i].slug === posts[j].slug;
      const bodyScore = jaccard(posts[i].tokenSet, posts[j].tokenSet);
      const titleScore = jaccard(new Set(words(posts[i].title)), new Set(words(posts[j].title)));
      if (sameSlug || bodyScore >= 0.42 || titleScore >= 0.62) {
        duplicatePairs.push({
          a: posts[i],
          b: posts[j],
          bodyScore,
          titleScore,
          sameSlug,
          severity: sameSlug || bodyScore >= 0.55 || titleScore >= 0.78 ? "high" : "medium"
        });
      }
    }
  }
  duplicatePairs.sort((a, b) => Number(b.sameSlug) - Number(a.sameSlug) || Math.max(b.bodyScore, b.titleScore) - Math.max(a.bodyScore, a.titleScore));

  const thinPosts = posts.filter(p => p.wordCount < 650).sort((a, b) => a.wordCount - b.wordCount);
  const repetition = posts.map(post => ({ post, phrases: repeatedPhrases(post) })).filter(x => x.phrases.length);
  const visualProblems = posts
    .filter(post => ["missing", "fallback", "weak"].includes(post.coverStatus.status))
    .sort((a, b) => {
      const rank = { missing: 0, fallback: 1, weak: 2 };
      return rank[a.coverStatus.status] - rank[b.coverStatus.status];
    });
  const stalePosts = posts.filter(post => post.daysOld !== null && post.daysOld > OLD_POST_DAYS).sort((a, b) => b.daysOld - a.daysOld);

  const affiliateProblems = posts.map(post => {
    const bad = post.affiliateUrls.filter(url => /amazon\.com/i.test(url) && amazonTag(url) !== EXPECTED_AMAZON_TAG);
    const exampleLinks = post.affiliateUrls.filter(url => /\/dp\/example/i.test(url) || /\/dp\/EXAMPLE/.test(url));
    const shortLinks = post.affiliateUrls.filter(url => /amzn\.to/i.test(url));
    return { post, bad, exampleLinks, shortLinks };
  }).filter(x => x.bad.length || x.exampleLinks.length || x.shortLinks.length);

  const categoryMap = new Map();
  for (const post of posts) {
    const key = post.categories.slice().sort().join(" / ") || "Uncategorized";
    if (!categoryMap.has(key)) categoryMap.set(key, []);
    categoryMap.get(key).push(post);
  }
  const categoryClusters = [...categoryMap.entries()]
    .map(([category, items]) => ({ category, count: items.length, slugs: items.map(p => p.slug) }))
    .sort((a, b) => b.count - a.count);

  const repairQueue = [
    ...affiliateProblems.flatMap(item => [
      ...item.bad.map(url => ({ priority: "P0", action: "fix_affiliate_tag", slug: item.post.slug, detail: url })),
      ...item.exampleLinks.map(url => ({ priority: "P0", action: "replace_placeholder_product", slug: item.post.slug, detail: url })),
      ...item.shortLinks.map(url => ({ priority: "P1", action: "verify_shortlink_attribution", slug: item.post.slug, detail: url }))
    ]),
    ...visualProblems.map(post => ({ priority: post.coverStatus.status === "missing" ? "P0" : "P1", action: "repair_cover_image", slug: post.slug, detail: `${post.coverStatus.status}: ${post.cover || "(none)"}` })),
    ...duplicatePairs.filter(pair => pair.severity === "high").map(pair => ({ priority: pair.sameSlug ? "P0" : "P1", action: pair.sameSlug ? "dedupe_duplicate_slug" : "merge_duplicate_post", slug: pair.a.slug, detail: `${pair.a.slug} <-> ${pair.b.slug}` })),
    ...repetition.map(item => ({ priority: "P2", action: "rewrite_repetition", slug: item.post.slug, detail: item.phrases.map(p => `${p.phrase} x${p.count}`).join("; ") })),
    ...thinPosts.slice(0, 30).map(post => ({ priority: "P2", action: "expand_or_merge_thin_post", slug: post.slug, detail: `${post.wordCount} words` })),
    ...stalePosts.slice(0, 30).map(post => ({ priority: "P3", action: "review_old_post_date", slug: post.slug, detail: `${post.date} (${post.daysOld} days old)` }))
  ];

  return { duplicatePairs, thinPosts, repetition, visualProblems, stalePosts, affiliateProblems, categoryClusters, repairQueue };
}

function list(lines, empty = "None found.") {
  return lines.length ? lines.join("\n") : empty;
}

function report(posts, result) {
  const high = result.duplicatePairs.filter(p => p.severity === "high");
  const medium = result.duplicatePairs.filter(p => p.severity !== "high").slice(0, 30);
  const mergeLines = high.slice(0, 30).map(pair => {
    const keep = pair.a.wordCount >= pair.b.wordCount ? pair.a : pair.b;
    const review = keep === pair.a ? pair.b : pair.a;
    const label = pair.sameSlug ? "DUPLICATE SLUG" : "REVIEW MERGE";
    return `- ${label}: likely keep \`${keep.slug}\` (${keep.wordCount} words), compare/update/remove \`${review.slug}\` (${review.wordCount} words). Scores: body ${pair.bodyScore.toFixed(2)}, title ${pair.titleScore.toFixed(2)}.`;
  });

  return [
    "# The Clean Code Content Optimizer Report",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    `Posts scanned: ${posts.length}`,
    `Expected Amazon tag: ${EXPECTED_AMAZON_TAG}`,
    "",
    "## Summary",
    "",
    `- High duplicate/merge candidates: ${high.length}`,
    `- Medium similarity pairs: ${medium.length}`,
    `- Thin posts under 650 words: ${result.thinPosts.length}`,
    `- Posts with repeated phrase patterns: ${result.repetition.length}`,
    `- Posts with affiliate-link issues: ${result.affiliateProblems.length}`,
    `- Posts with missing/fallback/weak covers: ${result.visualProblems.length}`,
    `- Old posts to review (${OLD_POST_DAYS}+ days): ${result.stalePosts.length}`,
    `- Repair queue items: ${result.repairQueue.length}`,
    "",
    "## Priority Repair Queue",
    "",
    list(result.repairQueue.slice(0, 80).map(item => `- ${item.priority} ${item.action}: \`${item.slug}\` - ${item.detail}`)),
    "",
    "## Visual Problems",
    "",
    list(result.visualProblems.map(post => `- \`${post.slug}\`: ${post.coverStatus.status} - ${post.coverStatus.reason} (${post.cover || "no cover"})`)),
    "",
    "## Delete Or Merge Candidates",
    "",
    "Do not delete automatically. Check Search Console/analytics first; merge weaker posts into stronger posts and redirect old slugs if they are public.",
    "",
    list(mergeLines),
    "",
    "## Similarity Watchlist",
    "",
    list(medium.map(pair => `- \`${pair.a.slug}\` <-> \`${pair.b.slug}\` | body ${pair.bodyScore.toFixed(2)} | title ${pair.titleScore.toFixed(2)}`)),
    "",
    "## Thin Posts",
    "",
    list(result.thinPosts.slice(0, 50).map(post => `- \`${post.slug}\` | ${post.wordCount} words | ${post.title}`)),
    "",
    "## Repetition Warnings",
    "",
    list(result.repetition.slice(0, 40).map(item => `- \`${item.post.slug}\`: ${item.phrases.map(p => `"${p.phrase}" x${p.count}`).join("; ")}`)),
    "",
    "## Affiliate Link Problems",
    "",
    list(result.affiliateProblems.map(item => {
      const problems = [
        ...item.bad.map(url => `wrong/missing tag: ${url}`),
        ...item.exampleLinks.map(url => `example placeholder: ${url}`),
        ...item.shortLinks.map(url => `short link verify manually: ${url}`)
      ];
      return `- \`${item.post.slug}\`: ${problems.join(" | ")}`;
    })),
    "",
    "## Old Post Date Review",
    "",
    "These may be fine, but review them if recently uploaded posts appear with stale dates.",
    "",
    list(result.stalePosts.slice(0, 40).map(post => `- \`${post.slug}\` | ${post.date} | ${post.daysOld} days old | ${post.title}`)),
    "",
    "## Category Density",
    "",
    list(result.categoryClusters.slice(0, 20).map(cluster => `- ${cluster.category}: ${cluster.count} posts`)),
    "",
    "## Recommended Workflow",
    "",
    "1. Fix affiliate tag issues first because they directly affect revenue attribution.",
    "2. Replace placeholder Amazon products with real products from Amazon Associates/SiteStripe.",
    "3. Generate real cover images for missing covers and replace SVG fallback covers when possible.",
    "4. Merge exact duplicate slugs before publishing more posts.",
    "5. Expand thin posts that target useful keywords; remove thin posts only when they are also redundant.",
    "6. Feed this report to Scout/Scribe so the factory avoids already-covered topics.",
    ""
  ].join("\n");
}

const posts = parsePosts();
const result = audit(posts);
fs.mkdirSync(OUT_DIR, { recursive: true });
const mdPath = path.join(OUT_DIR, `content-audit-${today()}.md`);
const jsonPath = path.join(OUT_DIR, `content-audit-${today()}.json`);
const repairPath = path.join(OUT_DIR, `repair-plan-${today()}.json`);

fs.writeFileSync(mdPath, report(posts, result), "utf8");
fs.writeFileSync(jsonPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  expectedAmazonTag: EXPECTED_AMAZON_TAG,
  duplicatePairs: result.duplicatePairs.map(pair => ({
    a: pair.a.slug,
    b: pair.b.slug,
    bodyScore: Number(pair.bodyScore.toFixed(4)),
    titleScore: Number(pair.titleScore.toFixed(4)),
    sameSlug: pair.sameSlug,
    severity: pair.severity
  })),
  thinPosts: result.thinPosts.map(post => ({ slug: post.slug, title: post.title, wordCount: post.wordCount })),
  repetition: result.repetition.map(item => ({ slug: item.post.slug, phrases: item.phrases })),
  affiliateProblems: result.affiliateProblems.map(item => ({ slug: item.post.slug, bad: item.bad, exampleLinks: item.exampleLinks, shortLinks: item.shortLinks })),
  visualProblems: result.visualProblems.map(post => ({ slug: post.slug, title: post.title, cover: post.cover, status: post.coverStatus.status, reason: post.coverStatus.reason })),
  stalePosts: result.stalePosts.map(post => ({ slug: post.slug, title: post.title, date: post.date, daysOld: post.daysOld })),
  repairQueue: result.repairQueue,
  categoryClusters: result.categoryClusters
}, null, 2), "utf8");
fs.writeFileSync(repairPath, JSON.stringify(result.repairQueue, null, 2), "utf8");

console.log(`Content audit written: ${mdPath}`);
console.log(`Machine report written: ${jsonPath}`);
console.log(`Repair plan written: ${repairPath}`);
console.log(`High duplicate candidates: ${result.duplicatePairs.filter(p => p.severity === "high").length}`);
console.log(`Thin posts: ${result.thinPosts.length}`);
console.log(`Affiliate issues: ${result.affiliateProblems.length}`);
console.log(`Visual issues: ${result.visualProblems.length}`);
