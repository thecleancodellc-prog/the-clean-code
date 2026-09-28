#!/usr/bin/env node
// Topic audit — finds posts that cover the same subject even when worded differently.
// content-optimizer's whole-body Jaccard misses these (it reported 0 duplicates while 3 home gym posts existed).
// Method: TF-IDF cosine over title x2 + slug + SEO keywords + excerpt + <h2> headings, generic eco words removed.
//
//   node scripts/topic-audit.mjs            # report -> outputs/content-audits/topic-audit-YYYY-MM-DD.{md,json}
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "outputs/content-audits");
const CLUSTER_AT = 0.35;
const WATCH_AT = 0.30;

const tmp = path.join(os.tmpdir(), `tcc-topic-${randomUUID()}.mjs`);
fs.copyFileSync(path.join(ROOT, "data/posts.js"), tmp);
const { posts } = await import(pathToFileURL(tmp).href);
fs.rmSync(tmp);

const STOP = new Set(("a an the and or for to of in on with your you how why what guide tips ways best top simple easy " +
  "eco friendly eco-friendly non toxic non-toxic sustainable sustainability green clean cleaner healthier healthy home homes " +
  "living natural safe safer choices alternatives alternative create creating make making beyond more less").split(/\s+/));
const stem = (w) => w.replace(/(ing|ies|es|s)$/, "");
const words = (s) => String(s || "").toLowerCase().replace(/<[^>]+>/g, " ").match(/[a-z]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)).map(stem) || [];
const wordCount = (html) => String(html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

const docs = posts.map((p) => {
  const heads = [...String(p.content || "").matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map((m) => m[1]).join(" ");
  const tf = new Map();
  for (const w of words([p.title, p.title, p.slug.replace(/-/g, " "), (p.seo?.keywords || []).join(" "), p.excerpt, heads].join(" ")))
    tf.set(w, (tf.get(w) || 0) + 1);
  return { p, tf, wc: wordCount(p.content) };
});
const df = new Map();
for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) || 0) + 1);
for (const d of docs) {
  d.vec = new Map([...d.tf].map(([w, c]) => [w, c * Math.log(docs.length / df.get(w))]));
  d.norm = Math.sqrt([...d.vec.values()].reduce((s, v) => s + v * v, 0));
}
const cos = (a, b) => {
  let s = 0;
  for (const [w, v] of a.vec) if (b.vec.has(w)) s += v * b.vec.get(w);
  return a.norm && b.norm ? s / (a.norm * b.norm) : 0;
};

const pairs = [];
for (let i = 0; i < docs.length; i++)
  for (let j = i + 1; j < docs.length; j++) {
    const score = cos(docs[i], docs[j]);
    if (score >= WATCH_AT) pairs.push({ score, a: docs[i], b: docs[j] });
  }
pairs.sort((x, y) => y.score - x.score);

const parent = docs.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
for (const { score, a, b } of pairs) if (score >= CLUSTER_AT) parent[find(docs.indexOf(a))] = find(docs.indexOf(b));
const groups = new Map();
docs.forEach((d, i) => groups.set(find(i), [...(groups.get(find(i)) || []), d]));
const clusters = [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length)
  .map((g) => g.sort((a, b) => String(a.p.date).localeCompare(String(b.p.date))).map((d) => ({ slug: d.p.slug, title: d.p.title, date: d.p.date, words: d.wc })));

const wcs = docs.map((d) => d.wc).sort((a, b) => a - b);
const summary = { posts: docs.length, clusters: clusters.length, medianWords: wcs[Math.floor(wcs.length / 2)], under1000: wcs.filter((w) => w < 1000).length };
const date = new Date().toISOString().slice(0, 10);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, `topic-audit-${date}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), summary, clusters,
  watchlist: pairs.filter((p) => p.score < CLUSTER_AT).map((p) => ({ score: +p.score.toFixed(2), a: p.a.p.slug, b: p.b.p.slug })) }, null, 2));

const md = [
  `# Topic Audit ${date}`, "",
  `- Posts: ${summary.posts}`, `- Same-topic clusters (cosine >= ${CLUSTER_AT}): ${summary.clusters}`,
  `- Median length: ${summary.medianWords} words; under 1,000 words: ${summary.under1000}`, "",
  "Clusters are candidates, not verdicts: related-but-distinct posts (e.g. window cleaning vs window treatments) also cluster.", "",
  ...clusters.flatMap((g, i) => [`## Cluster ${i + 1}`, ...g.map((d) => `- ${d.date} · ${d.words} words · \`${d.slug}\` — ${d.title}`), ""]),
].join("\n");
fs.writeFileSync(path.join(OUT_DIR, `topic-audit-${date}.md`), md);
console.log(`Topic audit: ${summary.posts} posts, ${summary.clusters} clusters, median ${summary.medianWords} words, ${summary.under1000} under 1,000.`);
console.log(`Report: outputs/content-audits/topic-audit-${date}.md`);
