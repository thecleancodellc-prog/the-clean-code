#!/usr/bin/env node
// Blog cover producer — replaces "slide" covers (SVG fallbacks and generated title cards) with local
// ComfyUI photos. Uses the same safety layer as the social producer: SD 1.5 checkpoint allowlist,
// PreviewImage only (nothing unscreened saved by ComfyUI), person/NSFW screening before any file is written.
//
//   node --env-file=.env.local scripts/blog-cover-producer.mjs --list
//   node --env-file=.env.local scripts/blog-cover-producer.mjs --slug=<slug>           # review copy only
//   node --env-file=.env.local scripts/blog-cover-producer.mjs --limit=5               # next 5, review only
//   node --env-file=.env.local scripts/blog-cover-producer.mjs --slug=<slug> --apply   # also update the site
//
// Review copies go to outputs/blog-covers/. --apply writes public/images/<slug>.png and points the post at it.
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { assertCheckpoint, SAFE_CHECKPOINT, checkImage, screenAndSave } from "./image-safety.mjs";
import { convertToJpeg } from "./optimize-covers.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const REVIEW_DIR = path.join(ROOT, "outputs/blog-covers");
// Title cards (2026-07-14 repair) are flat-colour 1792x1024 JPEGs at ~0.06 bytes/pixel. Low bytes/pixel alone
// is not enough: a clean white-background studio photo can be ~0.08. Real covers are now all <= 1200px wide.
const TITLE_CARD_MAX_BPP = 0.09;

function jpegDims(file) {
  const buf = fs.readFileSync(file);
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  return {
    list: args.includes("--list"),
    apply: args.includes("--apply"),
    slug: value("slug") || "",
    limit: Number(value("limit") || 1),
    skip: new Set((value("skip") || "").split(",").filter(Boolean)),
    // Reuse an existing review copy instead of generating a new one (e.g. apply approved covers later).
    reuse: args.includes("--reuse"),
  };
}

async function loadPosts() {
  const tmp = path.join(os.tmpdir(), `tcc-posts-${process.pid}.mjs`);
  fs.copyFileSync(POSTS_FILE, tmp);
  try {
    return (await import(pathToFileURL(tmp).href)).posts;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function coverKind(post) {
  const cover = String(post.cover || "");
  if (!cover || cover === "undefined") return "missing";
  if (cover.endsWith(".svg")) return "svg-fallback";
  const file = path.join(ROOT, "public", cover);
  if (!fs.existsSync(file)) return "missing";
  // Many older ".jpg" covers are really PNG bytes (DALL-E downloads); those are photos, never title cards.
  const magic = fs.readFileSync(file).subarray(0, 2);
  if (/\.jpe?g$/i.test(cover) && magic[0] === 0xff && magic[1] === 0xd8) {
    const dims = jpegDims(file);
    if (dims?.width === 1792 && dims.height === 1024 && fs.statSync(file).size / (dims.width * dims.height) < TITLE_CARD_MAX_BPP)
      return "title-card";
  }
  return "photo";
}

function topicScene(post) {
  const t = `${post.slug} ${post.title}`.toLowerCase();
  // SD 1.5 drifts to a generic living room unless the concrete subject comes first, so lead with the objects.
  const scenes = [
    [/\bcar\b|vehicle/, "clean car interior seen from the back seat, tan leather seats, dashboard and steering wheel, spotless floor mats, soft daylight through the windshield"],
    [/workshop|garage|tools/, "wooden workbench covered with hand tools, pegboard wall with hanging tools, wood shavings, glass jars of screws, garage workshop, daylight"],
    [/gym|fitness|workout|exercise/, "dumbbells and kettlebells on a wooden rack, exercise bike, cork yoga mat on black rubber floor tiles, home gym room with a large window"],
    [/laundry|detergent|fabric|wardrobe|clothing/, "folded organic cotton towels, wool dryer balls, plain unlabeled glass laundry jar, wooden scoop, woven basket, beautiful laundry room"],
    [/bedding|sleep|mattress|bedroom|allergy/, "organic cotton and linen bedding, neutral pillows, bedside plant, calm bedroom"],
    [/nursery|baby|toy|children|kids|playroom/, "calm nursery with wooden crib, organic cotton blankets, natural wooden toys, soft neutral rug"],
    [/candle|fragrance|freshener|scent|air/, "unlabeled soy candles in plain glass, dried eucalyptus, citrus peels, ceramic diffuser, linen curtains"],
    [/kitchen|dish|pantry|food|cooking|plastic|wrap/, "bright kitchen counter, clear glass jars without labels, beeswax food wraps, wooden cutting board, herbs"],
    [/bathroom|soap|shower|toilet/, "spa-like bathroom shelf, linen towel, plant, natural soap bar, bamboo toothbrushes, white tile"],
    [/garden|plant|pest|lawn|compost|ground|landscap|bee/, "home garden, terracotta pots, healthy green plants, natural wooden tools, soil"],
    [/light|lamp|led|window|curtain/, "sunlit living room, sheer linen curtains, large windows, warm natural light, plants"],
    [/holiday|gift|party|gathering|christmas/, "festive table with kraft paper gifts tied with twine, dried orange slices, pine sprigs, beeswax candles"],
    [/pet|dog|cat/, "cozy pet corner with natural fiber dog bed, ceramic water bowl, cotton rope toy, no animals"],
    [/electronic|e-waste|energy|solar|smart/, "minimal desk with laptop closed, bamboo organizer, cable box, plant, soft daylight"],
    [/renovat|construction|wall|paint|floor|carpet|roof|insulation|soundproof|garage|workshop|tools/, "renovated room with natural wood flooring, clay plaster walls, wool rug, hand tools on a wooden bench"],
    [/water|plumbing|rain/, "glass pitcher of water, rain barrel by garden wall, clean sink with brass faucet"],
    [/travel/, "packed canvas weekender bag, reusable bottle, linen shirt folded, map, sunlight"],
    [/art|craft|studio/, "craft table with natural paper, beeswax crayons, glass jars of brushes, cotton apron"],
  ];
  return scenes.find(([re]) => re.test(t))?.[1] ||
    "high-end clean modern home still life, natural materials, glass, wood, greenery, cotton textiles";
}

function promptFor(post) {
  return [
    `Aesthetic clean-living lifestyle photography, ${topicScene(post)}.`,
    "Horizontal 3:2 landscape composition, premium editorial interior photo, realistic, warm natural sunlight, magazine-quality.",
    "Soft greens, creams, whites, light wood, shallow depth of field, high detail, clean uncluttered composition.",
    "Empty room and inanimate household objects only. Unlabeled containers, labels hidden or turned away.",
    "No readable text, no words, no letters, no logos, no labels, no brand marks, no people, no humans, no faces, no bodies, no hands, no skin, no nudity, no cartoon, no illustration.",
  ].join(" ");
}

function negativePrompt() {
  return [
    "text, typography, letters, words, logo, watermark, signature, label, product label, brand name",
    "cartoon, illustration, anime, CGI, plastic look, low quality, blurry, noisy, distorted, warped",
    "cluttered, harsh fluorescent light, person, people, woman, man, human, face, body, hands, skin, portrait, model, nudity, naked, nude, breasts, lingerie",
    "deformed objects, bad perspective, oversaturated colors",
  ].join(", ");
}

// Two-pass "hires fix": 768x512 base (SD 1.5 native), then latent upscale x1.5 and refine at low denoise.
function workflow(prompt, negative) {
  const checkpoint = assertCheckpoint(process.env.COMFYUI_CHECKPOINT || SAFE_CHECKPOINT);
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const sampler = { steps: 24, cfg: 7, sampler_name: "dpmpp_2m", scheduler: "karras" };
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: negative, clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width: 768, height: 512, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { ...sampler, seed, denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0] } },
    "8": { class_type: "LatentUpscaleBy", inputs: { samples: ["5", 0], upscale_method: "nearest-exact", scale_by: 1.5 } },
    "9": { class_type: "KSampler", inputs: { ...sampler, steps: 16, seed, denoise: 0.5, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["8", 0] } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["9", 0], vae: ["1", 2] } },
    "7": { class_type: "PreviewImage", inputs: { images: ["6", 0] } },
  };
}

const base = () => (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/+$/, "");
async function getJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

export async function generateLocalCover(post) {
  if (!/^[a-z0-9-]+$/.test(post.slug)) throw new Error(`Invalid slug: ${post.slug}`);
  const flow = workflow(promptFor(post), negativePrompt());
  const { prompt_id } = await getJson(`${base()}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: flow, client_id: randomUUID() }),
  });
  if (!prompt_id) throw new Error("ComfyUI did not return a prompt_id.");
  console.log(`[blog-cover] ${post.slug}: queued ${prompt_id}, waiting for ComfyUI...`);

  const started = Date.now();
  let history;
  while (!(history = (await getJson(`${base()}/history/${prompt_id}`))[prompt_id])) {
    if (Date.now() - started > 10 * 60 * 1000) throw new Error(`Timed out waiting for ${prompt_id}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const image = Object.values(history.outputs || {}).map((o) => o.images?.[0]).find((i) => i?.filename);
  if (!image) throw new Error(`ComfyUI finished ${prompt_id} but returned no image.`);

  const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "temp" });
  const res = await fetch(`${base()}/view?${params}`);
  if (!res.ok) throw new Error(`Failed to download ComfyUI image: HTTP ${res.status}`);

  fs.mkdirSync(REVIEW_DIR, { recursive: true });
  const dest = path.join(REVIEW_DIR, `${post.slug}.png`);
  const report = await screenAndSave(Buffer.from(await res.arrayBuffer()), dest); // throws if person/NSFW
  console.log(`[blog-cover] ${post.slug}: passed safety (person ${report.personScore.toFixed(3)}, nsfw ${report.nsfwScore.toFixed(4)}) -> ${path.relative(ROOT, dest)}`);
  return dest;
}

async function applyCover(post, reviewFile) {
  // Publish a web-sized JPEG (~200 KB), not the ~2 MB review PNG.
  const publicRel = `/images/${post.slug}.jpg`;
  convertToJpeg(reviewFile, path.join(ROOT, "public", publicRel));
  const source = fs.readFileSync(POSTS_FILE, "utf8");
  const slugAt = source.indexOf(`slug: "${post.slug}"`);
  if (slugAt === -1) throw new Error(`Could not find ${post.slug} in posts.js`);
  const coverRe = /cover:\s*"[^"]*"/y;
  const coverAt = source.indexOf("cover:", slugAt);
  coverRe.lastIndex = coverAt;
  if (!coverRe.test(source)) throw new Error(`Could not find cover for ${post.slug}`);
  const updated = source.slice(0, coverAt) + `cover: "${publicRel}"` + source.slice(coverRe.lastIndex);
  // Same guard as Publisher: never write a posts.js that would break the site build.
  // Unique name per check: ESM caches modules by URL, so reusing one path would re-validate stale content.
  const tmp = path.join(os.tmpdir(), `tcc-posts-check-${process.pid}-${randomUUID()}.mjs`);
  fs.writeFileSync(tmp, updated);
  try {
    const { posts } = await import(pathToFileURL(tmp).href);
    if (posts.find((p) => p.slug === post.slug)?.cover !== publicRel) throw new Error("cover update did not take");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  fs.writeFileSync(POSTS_FILE, updated, "utf8");
  console.log(`[blog-cover] ${post.slug}: site cover -> ${publicRel}`);
}

export async function prepareLocalCoverGeneration() {
  assertCheckpoint(process.env.COMFYUI_CHECKPOINT || SAFE_CHECKPOINT);
  await checkImage("--check");
  await getJson(`${base()}/system_stats`);
}

async function main() {
  const options = parseArgs();
  const posts = await loadPosts();
  const candidates = posts.filter((p) => coverKind(p) !== "photo" && !options.skip.has(p.slug));

  if (options.list) {
    for (const p of candidates) console.log(`${coverKind(p).padEnd(13)} ${p.slug}`);
    console.log(`\n${candidates.length} of ${posts.length} posts need a photo cover.`);
    return;
  }

  await prepareLocalCoverGeneration();
  const targets = options.slug
    ? [posts.find((p) => p.slug === options.slug) || (() => { throw new Error(`No post with slug ${options.slug}`); })()]
    : candidates.slice(0, options.limit);

  let ok = 0;
  for (const post of targets) {
    try {
      const existing = path.join(REVIEW_DIR, `${post.slug}.png`);
      const reused = options.reuse && fs.existsSync(existing) && fs.existsSync(existing + ".safety.json");
      if (reused) console.log(`[blog-cover] ${post.slug}: reusing screened review copy`);
      const file = reused ? existing : await generateLocalCover(post);
      if (options.apply) await applyCover(post, file);
      ok++;
    } catch (err) {
      console.error(`[blog-cover] ${post.slug}: FAILED — ${err.message}`);
    }
  }
  console.log(`[blog-cover] Done: ${ok}/${targets.length} succeeded${options.apply ? " and applied" : " (review copies only; rerun with --apply to publish)"}.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
