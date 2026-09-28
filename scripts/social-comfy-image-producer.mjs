#!/usr/bin/env node
// Local Image Studio for The Clean Code social assets.
// Talks to a local ComfyUI server. No paid image API is used.

import fs from "fs";
import { assertCheckpoint, SAFE_CHECKPOINT, checkImage, screenAndSave } from "./image-safety.mjs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "outputs/social-command-center");
const QUEUE_FILE = path.join(OUT_DIR, "queue.json");
const STATUS_FILE = path.join(OUT_DIR, "status.json");
const IMAGE_STATUS_FILE = path.join(OUT_DIR, "local-image-status.json");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    check: args.includes("--check"),
    force: args.includes("--force"),
    carousel: args.includes("--carousel") || args.some(arg => arg.startsWith("--carousel-slides=")),
    carouselSlides: Math.max(2, Number(args.find(arg => arg.startsWith("--carousel-slides="))?.split("=")[1] || 5)),
    limit: Number(args.find(arg => arg.startsWith("--limit="))?.split("=")[1] || process.env.LOCAL_IMAGE_LIMIT || 1),
    slug: args.find(arg => arg.startsWith("--slug="))?.split("=")[1] || "",
    platform: args.find(arg => arg.startsWith("--platform="))?.split("=")[1] || "both"
  };
}

function carouselScene(item, slide, index, count) {
  const text = `${slide?.text || ""} ${slide?.visualDirection || ""}`.toLowerCase();
  if (index === 0) return `inviting hero scene, ${topicSpin(item)}`;
  if (/plug-in|conventional|chemical|synthetic|pollute/.test(text)) {
    return "tasteful awareness scene with a generic unlabeled air freshener plug-in and a plain spray bottle pushed to the edge of frame, open window and fresh air as the visual focus, no danger symbols";
  }
  if (/candle|ocean breeze/.test(text)) {
    return "quiet tabletop scene with an unlit plain candle moved aside, beside sliced lemon, rosemary, eucalyptus and a small ceramic bowl";
  }
  if (/save|guide|call to action/.test(text) || index === count - 1) {
    return "finished clean-home scene with sunlight, flowing linen curtain, citrus, eucalyptus and an elegant blank notebook, generous calm negative space";
  }
  if (index % 2 === 0) {
    return "natural simmer-pot ingredients on a bright kitchen counter, sliced citrus, rosemary, cinnamon sticks and a simple stainless pot, soft rising steam";
  }
  return "fresh-air routine in a serene living room, open windows, linen curtains moving gently, green houseplants and a small bowl of citrus peels";
}

function carouselPromptFor(item, slide, index, count) {
  return [
    `Aesthetic clean-home still-life editorial photograph for slide ${index + 1} of a coherent Instagram carousel.`,
    carouselScene(item, slide, index, count) + ".",
    "Vertical 4:5 composition, premium realistic interior and still-life photography, warm natural sunlight, soft sage green, cream, white and light wood palette, high detail, consistent visual identity across the complete set. Empty room or object arrangement only, with no humans or human body parts.",
    "Leave generous uncluttered negative space for professionally typeset text to be added later outside the AI image.",
    "Absolutely no people, humans, faces, bodies, hands, skin, portraits, nudity or clothing models. No readable text, letters, logos, labels, brand marks, watermarks, packaging closeups, medical fear imagery, cartoon or illustration."
  ].join(" ");
}

function comfyBase() {
  return (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/+$/, "");
}

function topicSpin(item) {
  const text = `${item.slug} ${item.title}`.toLowerCase();
  if (/air|freshener|fragrance|scent|candle/.test(text)) return "open windows, fresh herbs, citrus peels, eucalyptus sprigs, plain unlabeled amber glass spray bottle turned away from camera, ceramic diffuser, linen curtains, sunlight across a tidy living room";
  if (/laundry|detergent|fabric/.test(text)) return "folded organic cotton towels, wool dryer balls, plain unlabeled glass laundry jar turned sideways, wooden scoop, woven basket, soft morning light in a beautiful laundry room";
  if (/bedding|sleep|mattress|bedroom/.test(text)) return "organic cotton bedding, linen textures, neutral pillows, bedside plant, calm warm natural light";
  if (/first-aid|kit|medicine/.test(text)) return "organized home wellness kit, plain amber bottles with labels hidden, cotton gauze, small wooden tray, aloe plant, clean soft natural light";
  if (/art|craft|studio/.test(text)) return "non-toxic craft table, natural paper, beeswax crayons, glass jars of brushes, cotton apron, clean minimal storage";
  if (/kitchen|dish|pantry|food|water/.test(text)) return "bright kitchen counter, clear glass jars without labels, ceramic bowl, wooden brush, filtered water pitcher with no branding, herbs, fresh clean surfaces";
  if (/bathroom|soap|personal-care/.test(text)) return "spa-like bathroom shelf, linen towel, plant, plain amber bottle facing away, natural soap bar, white tile, airy light";
  if (/garden|plant|pest|lawn|compost/.test(text)) return "home garden scene, terracotta pots, healthy green plants, natural tools, soil, golden-hour light";
  return "high-end clean modern home still life, natural materials, glass, wood, greenery, cotton textiles, soft daylight";
}

function promptFor(item, platform) {
  const ratio = platform === "pinterest" ? "vertical 2:3 composition" : "vertical 4:5 composition";
  return [
    `Aesthetic clean-living lifestyle photography, ${topicSpin(item)}.`,
    `${ratio}, premium editorial product/lifestyle photo, realistic, warm, aspirational but approachable, magazine-quality clean home still life.`,
    "Soft greens, creams, whites, light wood, natural sunlight, shallow depth of field, high detail, clean composition, simple text-free props.",
    "Empty room and inanimate household objects only.",
    "Use unlabeled containers, labels hidden or turned away, blank glass jars, folded fabrics, plants, wood, ceramic, and natural materials.",
    "Leave calm negative space for text overlay to be added later outside the AI image.",
    "Absolutely no readable text anywhere in the image, no words, no letters, no logos, no packaging labels, no brand marks, no product label closeups, empty unoccupied room or still-life objects only, no people, no humans, no faces, no bodies, no hands, no skin, no portraits, no nudity, no clutter, no medical fear imagery, no harsh chemicals, no cartoon, no illustration."
  ].join(" ");
}

function negativePrompt() {
  return [
    "text, typography, letters, words, readable text, logo, watermark, signature, label, fake label, product label, packaging text, brand name, misspelled words",
    "cartoon, illustration, anime, CGI, plastic look, low quality, blurry, noisy, distorted bottle, melted packaging, warped label",
    "cluttered composition, harsh fluorescent light, medical fear imagery, person, people, woman, man, human, face, body, hands, skin, portrait, model, nudity, naked, nude, breasts, lingerie, bedroom",
    "deformed objects, bad perspective, oversaturated colors"
  ].join(", ");
}

function imageSize(platform) {
  if (platform === "pinterest") {
    return {
      width: Number(process.env.COMFYUI_PINTEREST_WIDTH || 640),
      height: Number(process.env.COMFYUI_PINTEREST_HEIGHT || 960)
    };
  }
  return {
    width: Number(process.env.COMFYUI_INSTAGRAM_WIDTH || 768),
    height: Number(process.env.COMFYUI_INSTAGRAM_HEIGHT || 960)
  };
}

function workflow({ prompt, negative, platform, slug }) {
  const size = imageSize(platform);
  const checkpoint = assertCheckpoint(process.env.COMFYUI_CHECKPOINT || SAFE_CHECKPOINT);
  const steps = Number(process.env.COMFYUI_STEPS || 24);
  const cfg = Number(process.env.COMFYUI_CFG || 7);
  const sampler = process.env.COMFYUI_SAMPLER || "dpmpp_2m";
  const scheduler = process.env.COMFYUI_SCHEDULER || "karras";
  const seed = Number(process.env.COMFYUI_SEED || Math.floor(Math.random() * 1000000000));
  const prefix = `tcc_${slug}_${platform}`.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80);

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint }
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["1", 1] }
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: ["1", 1] }
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: size.width, height: size.height, batch_size: 1 }
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0]
      }
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] }
    },
    "7": {
      class_type: "PreviewImage",
      inputs: { images: ["6", 0] }
    }
  };
}

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return await res.json();
}

async function checkComfy() {
  const base = comfyBase();
  const stats = await getJson(`${base}/system_stats`);
  let checkpoints = [];
  try {
    const info = await getJson(`${base}/object_info/CheckpointLoaderSimple`);
    checkpoints = info?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  } catch {
    checkpoints = [];
  }
  return { base, stats, checkpoints };
}

async function queuePrompt(flow) {
  const base = comfyBase();
  const clientId = randomUUID();
  const data = await getJson(`${base}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: flow, client_id: clientId })
  });
  if (!data.prompt_id) throw new Error("ComfyUI did not return a prompt_id.");
  return data.prompt_id;
}

async function waitForHistory(promptId) {
  const base = comfyBase();
  const started = Date.now();
  const timeoutMs = Number(process.env.COMFYUI_TIMEOUT_MS || 10 * 60 * 1000);
  while (Date.now() - started < timeoutMs) {
    const history = await getJson(`${base}/history/${promptId}`);
    if (history?.[promptId]) return history[promptId];
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}`);
}

function findFirstImage(history) {
  for (const output of Object.values(history.outputs || {})) {
    const image = output.images?.[0];
    if (image?.filename) return image;
  }
  return null;
}

async function downloadImage(image, dest) {
  const base = comfyBase();
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || "",
    type: image.type || "output"
  });
  const res = await fetch(`${base}/view?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to download ComfyUI image: HTTP ${res.status}`);
  await screenAndSave(Buffer.from(await res.arrayBuffer()), dest);
}

function updateCounts(queue, status) {
  status.counts = {
    ...(status.counts || {}),
    visualAssetsReady: queue.filter(item => item.visuals?.pinterestPin?.status === "photo_ready" || item.visuals?.instagramCarousel?.status === "photo_ready").length,
    visualAssetsNeeded: queue.filter(item => item.visuals?.pinterestPin?.status === "needs_photo" || item.visuals?.instagramCarousel?.status === "needs_photo" || item.visuals?.pinterestPin?.status === "needs_asset" || item.visuals?.instagramCarousel?.status === "needs_asset").length
  };
}

async function generateOne(item, platform) {
  console.log(`[local-image] Preparing ${platform} image for ${item.slug}...`);
  if (!/^[a-z0-9-]+$/.test(item.slug)) throw new Error("Invalid asset slug");
  const dir = path.join(OUT_DIR, "assets", item.slug);
  ensureDir(dir);
  const dest = path.join(dir, platform === "pinterest" ? "pinterest-local.png" : "instagram-cover-local.png");
  const prompt = promptFor(item, platform);
  const flow = workflow({ prompt, negative: negativePrompt(), platform, slug: item.slug });
  console.log(`[local-image] Submitting prompt to ${comfyBase()}...`);
  const promptId = await queuePrompt(flow);
  console.log(`[local-image] Prompt accepted: ${promptId}. Waiting for ComfyUI to finish...`);
  const history = await waitForHistory(promptId);
  const image = findFirstImage(history);
  if (!image) throw new Error(`ComfyUI finished ${promptId} but returned no image.`);
  console.log(`[local-image] Downloading finished image to ${path.relative(ROOT, dest).replace(/\\/g, "/")}...`);
  await downloadImage(image, dest);
  console.log(`[local-image] Saved ${path.relative(ROOT, dest).replace(/\\/g, "/")}`);
  return { dest, prompt, promptId };
}

async function generateCarousel(item, slideLimit) {
  if (!/^[a-z0-9-]+$/.test(item.slug)) throw new Error("Invalid asset slug");
  const sourceSlides = item.visuals?.instagramCarousel?.slides || [];
  const slides = sourceSlides.slice(0, Math.min(slideLimit, sourceSlides.length || slideLimit));
  if (!slides.length) slides.push({ slide: 1, role: "cover", text: item.title });
  const dir = path.join(OUT_DIR, "assets", item.slug, "instagram-carousel");
  ensureDir(dir);
  const generatedImages = [];

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    const prompt = carouselPromptFor(item, slide, index, slides.length);
    const filename = `${String(index + 1).padStart(2, "0")}-${index === 0 ? "cover" : "scene"}.png`;
    const dest = path.join(dir, filename);
    const flow = workflow({ prompt, negative: negativePrompt(), platform: "instagram", slug: `${item.slug}_carousel_${index + 1}` });
    console.log(`[local-image] Submitting carousel slide ${index + 1}/${slides.length} for ${item.slug}...`);
    const promptId = await queuePrompt(flow);
    const history = await waitForHistory(promptId);
    const image = findFirstImage(history);
    if (!image) throw new Error(`ComfyUI finished ${promptId} but returned no image.`);
    await downloadImage(image, dest);
    const outputPath = path.relative(ROOT, dest).replace(/\\/g, "/");
    generatedImages.push({
      slide: index + 1,
      role: slide.role || (index === 0 ? "cover" : "scene"),
      overlayText: slide.text || "",
      outputPath,
      prompt,
      promptId
    });
    console.log(`[local-image] Saved carousel slide ${index + 1}: ${outputPath}`);
  }

  return {
    dest: path.join(ROOT, generatedImages[0].outputPath),
    prompt: generatedImages[0].prompt,
    promptId: generatedImages[0].promptId,
    generatedImages
  };
}

const options = parseArgs();
assertCheckpoint(process.env.COMFYUI_CHECKPOINT || SAFE_CHECKPOINT);
await checkImage("--check");

if (options.check) {
  try {
    const result = await checkComfy();
    console.log(`ComfyUI reachable: ${result.base}`);
    console.log(`Detected checkpoints: ${result.checkpoints.length}`);
    for (const name of result.checkpoints.slice(0, 12)) console.log(`- ${name}`);
    process.exit(0);
  } catch (err) {
    console.log(`ComfyUI is not reachable at ${comfyBase()}.`);
    console.log("Start ComfyUI first, then rerun: npm run social:local-check");
    console.log(`Details: ${err.cause?.code || err.message}`);
    process.exit(1);
  }
}

console.log(`[local-image] Starting local ComfyUI generation at ${new Date().toISOString()}`);
const queue = readJson(QUEUE_FILE, []);
const status = readJson(STATUS_FILE, {});
const platforms = options.platform === "both" ? ["pinterest", "instagram"] : [options.platform];
const candidates = queue
  .filter(item => item.visuals && (!options.slug || item.slug === options.slug))
  .filter(item => platforms.some(platform => {
    const key = platform === "pinterest" ? "pinterestPin" : "instagramCarousel";
    return options.force || item.visuals?.[key]?.status !== "photo_ready";
  }))
  .sort((a, b) => (a.blockers.length - b.blockers.length) || (b.score - a.score));

console.log(`[local-image] Candidates found: ${candidates.length}; limit: ${options.limit}; platform: ${options.platform}`);

if (!candidates.length) {
  console.log("No local image candidates found.");
  process.exit(0);
}

const produced = [];
for (const item of candidates.slice(0, options.limit)) {
  const record = { slug: item.slug, title: item.title, generated: [] };
  for (const platform of platforms) {
    const key = platform === "pinterest" ? "pinterestPin" : "instagramCarousel";
    item.visuals[key].status = "needs_photo";
    item.visuals.productionStatus = "needs_photo";
    delete item.visuals[key].outputPath;
    delete item.visuals[key].generatedImages;
    delete item.visuals[key].generatedSlideCount;
    delete item.visuals[key].mockupPath;
    updateCounts(queue, status);
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    const result = platform === "instagram" && options.carousel
      ? await generateCarousel(item, options.carouselSlides)
      : await generateOne(item, platform);
    item.visuals.productionStatus = "pending_manual_review";
    item.visuals[key].status = "photo_ready";
    item.visuals[key].provider = "local-comfyui";
    item.visuals[key].safety = { checked: true, reviewRequired: true, checkpoint: SAFE_CHECKPOINT };
    item.visuals[key].prompt = result.prompt;
    item.visuals[key].outputPath = path.relative(ROOT, result.dest).replace(/\\/g, "/");
    if (result.generatedImages) {
      item.visuals[key].generatedImages = result.generatedImages;
      item.visuals[key].generatedSlideCount = result.generatedImages.length;
      item.visuals[key].mockupPath = path.dirname(item.visuals[key].outputPath).replace(/\\/g, "/") + "/";
    }
    record.generated.push({ platform, promptId: result.promptId, outputPath: item.visuals[key].outputPath });
  }
  produced.push(record);
}

status.lastLocalImageRun = {
  generatedAt: new Date().toISOString(),
  provider: "local-comfyui",
  count: produced.length,
  produced: produced.map(item => item.slug)
};
updateCounts(queue, status);

console.log("[local-image] Writing queue/status metadata...");
fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
fs.writeFileSync(IMAGE_STATUS_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), provider: "local-comfyui", count: produced.length, produced }, null, 2), "utf8");

console.log(`Local ComfyUI images produced: ${produced.length}`);
for (const item of produced) {
  console.log(`- ${item.slug}`);
  for (const output of item.generated) console.log(`  ${output.platform}: ${output.outputPath}`);
}