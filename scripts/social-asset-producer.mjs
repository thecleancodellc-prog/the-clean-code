#!/usr/bin/env node
// Produces free local SVG social assets from Social Command Center visual briefs.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "outputs/social-command-center");
const QUEUE_FILE = path.join(OUT_DIR, "queue.json");
const ASSET_STATUS_FILE = path.join(OUT_DIR, "asset-status.json");
const STATUS_FILE = path.join(OUT_DIR, "status.json");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text, maxChars, maxLines = 5) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function textLines(lines, x, y, size, fill, weight = 700, gap = 1.18) {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * size * gap}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join("\n");
}

function imageDataUri(imageRef) {
  if (!imageRef || !imageRef.startsWith("/images/")) return "";
  const file = path.join(ROOT, "public", imageRef.replace(/^\//, ""));
  if (!fs.existsSync(file)) return "";
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
  const data = fs.readFileSync(file).toString("base64");
  return `data:${mime};base64,${data}`;
}

function svgShell(width, height, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="cleanBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4fff7"/>
      <stop offset="0.55" stop-color="#d9f7e4"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0b2c1b" flood-opacity=".18"/>
    </filter>
  </defs>
  ${inner}
</svg>`;
}

function writePinterest(item, dir) {
  const v = item.visuals?.pinterestPin || {};
  const bg = imageDataUri(item.platforms?.pinterest?.image);
  const title = wrap(v.textOverlay || item.title, 17, 5);
  const subtitle = wrap(item.platforms?.pinterest?.description || "Clean living guide from The Clean Code", 32, 5);
  const imageBlock = bg
    ? `<image href="${bg}" x="0" y="0" width="1000" height="760" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="0" width="1000" height="760" fill="rgba(8,45,27,.18)"/>`
    : `<rect width="1000" height="760" fill="url(#cleanBg)"/><circle cx="790" cy="170" r="210" fill="#86df9f" opacity=".45"/><circle cx="190" cy="520" r="240" fill="#b7f2ca" opacity=".55"/>`;
  const svg = svgShell(1000, 1500, `
  <rect width="1000" height="1500" fill="#f4fff7"/>
  ${imageBlock}
  <rect x="72" y="650" width="856" height="700" rx="42" fill="rgba(255,255,255,.94)" filter="url(#shadow)"/>
  <text x="118" y="735" font-size="34" font-weight="800" fill="#34764a">THE CLEAN CODE</text>
  ${textLines(title, 118, 850, 78, "#103b25", 900, 1.05)}
  ${textLines(subtitle, 122, 1180, 32, "#38634a", 500, 1.22)}
  <rect x="118" y="1280" width="270" height="58" rx="29" fill="#65d58b"/>
  <text x="154" y="1320" font-size="26" font-weight="800" fill="#0d2f1e">READ GUIDE</text>
  <text x="118" y="1410" font-size="27" font-weight="700" fill="#1d5435">thecleancode.co</text>`);
  const file = path.join(dir, "pinterest-pin.svg");
  fs.writeFileSync(file, svg, "utf8");
  return file;
}

function writeCarousel(item, dir) {
  const carouselDir = path.join(dir, "instagram-carousel");
  fs.mkdirSync(carouselDir, { recursive: true });
  const slides = item.visuals?.instagramCarousel?.slides || [{ text: item.title, role: "hook" }];
  const files = [];
  slides.forEach((slide, index) => {
    const isCover = index === 0;
    const headline = wrap(slide.text || item.title, isCover ? 16 : 24, isCover ? 5 : 7);
    const svg = svgShell(1080, 1350, `
  <rect width="1080" height="1350" fill="url(#cleanBg)"/>
  <circle cx="890" cy="170" r="250" fill="#65d58b" opacity=".28"/>
  <circle cx="130" cy="1110" r="310" fill="#b7f2ca" opacity=".42"/>
  <rect x="86" y="94" width="908" height="1162" rx="38" fill="rgba(255,255,255,.84)" stroke="#8bdca7" stroke-width="4" filter="url(#shadow)"/>
  <text x="132" y="174" font-size="30" font-weight="850" fill="#34764a">THE CLEAN CODE</text>
  <text x="132" y="238" font-size="24" font-weight="700" fill="#6a8d78">${esc(slide.role || "clean living")}</text>
  ${textLines(headline, 132, isCover ? 405 : 350, isCover ? 74 : 54, "#103b25", isCover ? 900 : 760, 1.12)}
  <text x="132" y="1138" font-size="27" font-weight="700" fill="#34764a">${esc(index + 1)} / ${esc(slides.length)}</text>
  <text x="132" y="1200" font-size="26" font-weight="700" fill="#1d5435">Save this guide</text>`);
    const file = path.join(carouselDir, `slide-${String(index + 1).padStart(2, "0")}.svg`);
    fs.writeFileSync(file, svg, "utf8");
    files.push(file);
  });
  return files;
}

function writeStoryboard(item, dir) {
  const video = item.visuals?.shortVideo || {};
  const lines = [
    `SHORT VIDEO STORYBOARD - ${item.title}`,
    `Slug: ${item.slug}`,
    `Format: ${video.size || "1080x1920"} ${video.duration || ""}`.trim(),
    "",
    ...(video.storyboard || []).map(scene => [
      `${scene.seconds || ""}`,
      `SHOT: ${scene.shot || ""}`,
      `OVERLAY: ${scene.overlay || ""}`,
      `VOICEOVER: ${scene.voiceover || ""}`
    ].join("\n")),
    "",
    "B-ROLL CHECKLIST:",
    ...(video.bRollChecklist || []).map(item => `- ${item}`)
  ];
  const file = path.join(dir, "short-video-storyboard.txt");
  fs.writeFileSync(file, lines.join("\n\n"), "utf8");
  return file;
}

const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith("--limit="));
const limit = Number(limitArg?.split("=")[1] || process.env.SOCIAL_ASSET_LIMIT || 3);
const queue = readJson(QUEUE_FILE, []);
const candidates = queue
  .filter(item => item.visuals?.productionStatus === "brief_ready")
  .sort((a, b) => (a.blockers.length - b.blockers.length) || (b.score - a.score));

const produced = [];
for (const item of candidates.slice(0, limit)) {
  const dir = path.join(OUT_DIR, "assets", item.slug);
  fs.mkdirSync(dir, { recursive: true });
  const pinterest = writePinterest(item, dir);
  const carousel = writeCarousel(item, dir);
  const storyboard = writeStoryboard(item, dir);
  item.visuals.productionStatus = "assets_ready";
  item.visuals.pinterestPin.status = "asset_ready";
  item.visuals.pinterestPin.outputPath = path.relative(ROOT, pinterest).replace(/\\/g, "/");
  item.visuals.instagramCarousel.status = "asset_ready";
  item.visuals.instagramCarousel.outputPath = path.relative(ROOT, path.dirname(carousel[0])).replace(/\\/g, "/") + "/";
  item.visuals.shortVideo.status = "storyboard_ready";
  item.visuals.shortVideo.outputPath = path.relative(ROOT, storyboard).replace(/\\/g, "/");
  produced.push({ slug: item.slug, title: item.title, pinterest, carouselCount: carousel.length, storyboard });
}

const status = readJson(STATUS_FILE, {});
status.counts = {
  ...(status.counts || {}),
  visualBriefs: queue.filter(item => item.visuals?.productionStatus === "brief_ready").length,
  visualAssetsReady: queue.filter(item => item.visuals?.pinterestPin?.status === "asset_ready" || item.visuals?.instagramCarousel?.status === "asset_ready").length,
  visualAssetsNeeded: queue.filter(item => item.visuals?.pinterestPin?.status === "needs_asset" || item.visuals?.instagramCarousel?.status === "needs_asset" || item.visuals?.shortVideo?.status === "needs_asset").length
};
status.lastAssetRun = { generatedAt: new Date().toISOString(), count: produced.length, produced: produced.map(item => item.slug) };

fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
fs.writeFileSync(ASSET_STATUS_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: produced.length, produced }, null, 2), "utf8");

console.log(`Social assets produced: ${produced.length}`);
for (const item of produced) console.log(`- ${item.slug}: pin + ${item.carouselCount} carousel slides + storyboard`);