#!/usr/bin/env node
// Generates real aesthetic social images from Social Command Center briefs.
// Default mode is dry-run so image API credits are never spent by accident.

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "outputs/social-command-center");
const QUEUE_FILE = path.join(OUT_DIR, "queue.json");
const STATUS_FILE = path.join(OUT_DIR, "status.json");
const IMAGE_STATUS_FILE = path.join(OUT_DIR, "image-status.json");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    generate: args.includes("--generate"),
    dryRun: args.includes("--dry-run") || !args.includes("--generate"),
    limit: Number(args.find(arg => arg.startsWith("--limit="))?.split("=")[1] || process.env.SOCIAL_IMAGE_LIMIT || 1),
    slug: args.find(arg => arg.startsWith("--slug="))?.split("=")[1] || ""
  };
}

function topicSpin(item) {
  const text = `${item.slug} ${item.title}`.toLowerCase();
  if (/air|freshener|fragrance|scent|candle/.test(text)) {
    return "a serene clean-living vignette with open windows, fresh herbs, citrus peels, eucalyptus, amber glass spray bottle, ceramic diffuser, linen curtains, and sunlight across a tidy living room";
  }
  if (/laundry|detergent|fabric/.test(text)) {
    return "a beautiful laundry-room still life with folded organic cotton towels, wool dryer balls, glass detergent jar, wooden scoop, and soft morning light";
  }
  if (/bedding|sleep|mattress|bedroom/.test(text)) {
    return "a calm bedroom scene with organic cotton bedding, linen textures, neutral pillows, bedside plant, and warm natural light";
  }
  if (/first-aid|kit|medicine/.test(text)) {
    return "a clean organized home wellness kit with labeled amber bottles, cotton gauze, small wooden tray, aloe plant, and soft natural light";
  }
  if (/art|craft|studio/.test(text)) {
    return "a bright non-toxic craft table with natural paper, beeswax crayons, glass jars of brushes, cotton apron, and clean minimal storage";
  }
  if (/kitchen|dish|pantry|food|water/.test(text)) {
    return "a bright kitchen counter with glass jars, ceramic bowl, wooden brush, filtered water pitcher, herbs, and fresh clean surfaces";
  }
  if (/bathroom|soap|personal-care/.test(text)) {
    return "a spa-like bathroom shelf with linen towel, plant, amber bottle, natural soap bar, white tile, and airy light";
  }
  if (/garden|plant|pest|lawn|compost/.test(text)) {
    return "an aesthetic home garden scene with terracotta pots, healthy green plants, natural tools, soil, and golden-hour light";
  }
  return "a high-end clean modern home still life with natural materials, glass, wood, greenery, cotton textiles, and soft daylight";
}

function promptFor(item, platform) {
  const spin = topicSpin(item);
  const ratio = platform === "pinterest" ? "vertical 2:3 composition" : "vertical 4:5 composition";
  return [
    `${spin}.`,
    `${ratio}, premium editorial lifestyle photography for a clean living brand.`,
    "Aesthetic, warm, realistic, aspirational but approachable, high-resolution, shallow depth of field, natural colors, soft greens, creams, whites, light wood.",
    "The image should visually relate to the blog topic without text baked into the image.",
    `Blog topic: ${item.title}.`,
    "No logos, no words, no typography, no fake product labels, no people facing camera, no medical fear imagery, no harsh chemicals, no clutter, no cartoon, no illustration."
  ].join(" ");
}

async function generateImage(client, prompt, dest, size) {
  const model = process.env.OPENAI_SOCIAL_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const quality = process.env.OPENAI_SOCIAL_IMAGE_QUALITY || process.env.OPENAI_IMAGE_QUALITY || "high";
  let response;
  try {
    response = await client.images.generate({ model, prompt, n: 1, size, quality });
  } catch (err) {
    if (size !== "1024x1024") {
      response = await client.images.generate({ model, prompt, n: 1, size: "1024x1024", quality });
    } else {
      throw err;
    }
  }

  const image = response.data?.[0] || {};
  if (image.b64_json) {
    fs.writeFileSync(dest, Buffer.from(image.b64_json, "base64"));
    return;
  }
  if (image.url) {
    const res = await fetch(image.url);
    if (!res.ok) throw new Error(`Failed to download generated image: ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return;
  }
  throw new Error("Image API returned no usable image data.");
}

function writePromptPacket(item, dir, pinterestPrompt, instagramPrompt) {
  const packet = [
    `SOCIAL IMAGE PROMPTS - ${item.title}`,
    `Slug: ${item.slug}`,
    "",
    "PINTEREST IMAGE PROMPT",
    pinterestPrompt,
    "",
    "INSTAGRAM COVER IMAGE PROMPT",
    instagramPrompt,
    "",
    "Creative rule: generate photographic images first; add any text overlays later in Canva or the command center, never inside the AI photo."
  ].join("\n\n");
  const file = path.join(dir, "image-prompts.txt");
  fs.writeFileSync(file, packet, "utf8");
  return file;
}

function updateCounts(queue, status) {
  status.counts = {
    ...(status.counts || {}),
    visualBriefs: queue.filter(item => item.visuals?.productionStatus === "brief_ready").length,
    visualAssetsReady: queue.filter(item => item.visuals?.pinterestPin?.status === "photo_ready" || item.visuals?.instagramCarousel?.status === "photo_ready").length,
    visualAssetsNeeded: queue.filter(item => item.visuals?.pinterestPin?.status === "needs_photo" || item.visuals?.instagramCarousel?.status === "needs_photo" || item.visuals?.pinterestPin?.status === "needs_asset" || item.visuals?.instagramCarousel?.status === "needs_asset").length
  };
}

const options = parseArgs();
const queue = readJson(QUEUE_FILE, []);
const status = readJson(STATUS_FILE, {});
const candidates = queue
  .filter(item => item.visuals && (!options.slug || item.slug === options.slug))
  .filter(item => item.visuals.pinterestPin?.status !== "photo_ready" || item.visuals.instagramCarousel?.status !== "photo_ready")
  .sort((a, b) => (a.blockers.length - b.blockers.length) || (b.score - a.score));

if (options.generate && !process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for --generate. Dry-run prompt packets do not need it.");
}

const client = options.generate ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const produced = [];

for (const item of candidates.slice(0, options.limit)) {
  const dir = path.join(OUT_DIR, "assets", item.slug);
  ensureDir(dir);
  const pinterestPrompt = promptFor(item, "pinterest");
  const instagramPrompt = promptFor(item, "instagram");
  const promptFile = writePromptPacket(item, dir, pinterestPrompt, instagramPrompt);

  const pinterestPath = path.join(dir, "pinterest-photo.png");
  const instagramPath = path.join(dir, "instagram-cover-photo.png");

  item.visuals.productionStatus = options.generate ? "photo_assets_ready" : "photo_prompts_ready";
  item.visuals.pinterestPin.status = options.generate ? "photo_ready" : "needs_photo";
  item.visuals.pinterestPin.prompt = pinterestPrompt;
  item.visuals.pinterestPin.outputPath = path.relative(ROOT, options.generate ? pinterestPath : promptFile).replace(/\\/g, "/");
  item.visuals.pinterestPin.mockupPath = `outputs/social-command-center/assets/${item.slug}/pinterest-pin.svg`;
  item.visuals.instagramCarousel.status = options.generate ? "photo_ready" : "needs_photo";
  item.visuals.instagramCarousel.coverPrompt = instagramPrompt;
  item.visuals.instagramCarousel.outputPath = path.relative(ROOT, options.generate ? instagramPath : promptFile).replace(/\\/g, "/");
  item.visuals.instagramCarousel.mockupPath = `outputs/social-command-center/assets/${item.slug}/instagram-carousel/`;

  if (options.generate) {
    await generateImage(client, pinterestPrompt, pinterestPath, process.env.OPENAI_PINTEREST_IMAGE_SIZE || "1024x1536");
    await generateImage(client, instagramPrompt, instagramPath, process.env.OPENAI_INSTAGRAM_IMAGE_SIZE || "1024x1536");
  }

  produced.push({
    slug: item.slug,
    title: item.title,
    mode: options.generate ? "generated" : "dry-run",
    promptFile,
    pinterest: options.generate ? pinterestPath : null,
    instagram: options.generate ? instagramPath : null
  });
}

status.lastImageRun = {
  generatedAt: new Date().toISOString(),
  mode: options.generate ? "generated" : "dry-run",
  count: produced.length,
  produced: produced.map(item => item.slug)
};
updateCounts(queue, status);

fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
fs.writeFileSync(IMAGE_STATUS_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), mode: status.lastImageRun.mode, count: produced.length, produced }, null, 2), "utf8");

console.log(`Social image producer ${status.lastImageRun.mode}: ${produced.length}`);
for (const item of produced) console.log(`- ${item.slug}: ${item.promptFile}`);