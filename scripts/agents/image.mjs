// Image - generates a cover image and saves it to public/images/
// Usage: node --env-file=.env.local scripts/agents/image.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info, warn } from "../lib/log.mjs";
import { budgetedImage } from "../lib/api-budget.mjs";
import { generateLocalCover, prepareLocalCoverGeneration } from "../blog-cover-producer.mjs";
import { convertToJpeg } from "../optimize-covers.mjs";

const AGENT = "Image";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeFallbackCover(slug, title) {
  const imgDir = path.join(ROOT, "public/images");
  const outDir = path.join(ROOT, "outputs/images");
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1792" height="1024" viewBox="0 0 1792 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ecfff3"/>
      <stop offset="0.52" stop-color="#b9f5cf"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="1792" height="1024" fill="url(#bg)"/>
  <circle cx="320" cy="260" r="180" fill="#78d99c" opacity=".30" filter="url(#soft)"/>
  <circle cx="1480" cy="760" r="240" fill="#4fbf7a" opacity=".20" filter="url(#soft)"/>
  <rect x="150" y="150" width="1492" height="724" rx="54" fill="rgba(255,255,255,.62)" stroke="#4fbf7a" stroke-width="6"/>
  <text x="210" y="292" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#1f5f3a">The Clean Code</text>
  <foreignObject x="210" y="360" width="1370" height="360">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,Helvetica,sans-serif;font-size:78px;font-weight:800;line-height:1.08;color:#133b29;">
      ${escapeHtml(title)}
    </div>
  </foreignObject>
  <text x="210" y="790" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#397451">Clean living, non-toxic home, better everyday systems</text>
</svg>`;

  const publicPath = path.join(imgDir, `${slug}.svg`);
  const outputPath = path.join(outDir, `${slug}.svg`);
  fs.writeFileSync(publicPath, svg, "utf8");
  fs.writeFileSync(outputPath, svg, "utf8");
  return { cover: `/images/${slug}.svg`, coverImagePath: `public/images/${slug}.svg` };
}

async function saveGeneratedImage(imageResponse, slug, b64Ext = "png") {
  const imgDir = path.join(ROOT, "public/images");
  const outDir = path.join(ROOT, "outputs/images");
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const image = imageResponse.data?.[0] || {};

  if (image.b64_json) {
    const destPath = path.join(imgDir, `${slug}.${b64Ext}`);
    fs.writeFileSync(destPath, Buffer.from(image.b64_json, "base64"));
    fs.copyFileSync(destPath, path.join(outDir, `${slug}.${b64Ext}`));
    return { cover: `/images/${slug}.${b64Ext}`, coverImagePath: `public/images/${slug}.${b64Ext}` };
  }

  if (image.url) {
    const destPath = path.join(imgDir, `${slug}.jpg`);
    const res = await fetch(image.url);
    if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);
    fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
    fs.copyFileSync(destPath, path.join(outDir, `${slug}.jpg`));
    return { cover: `/images/${slug}.jpg`, coverImagePath: `public/images/${slug}.jpg` };
  }

  throw new Error("Image API returned no usable image data.");
}

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const { slug, title } = ctx.postData;
  step(AGENT, `Generating cover image for: "${title}"`);

  const prompt = `Clean, bright lifestyle photography for a wellness blog article titled "${title}".
Natural light, eco-friendly aesthetic, minimal and modern composition.
No text, no people, no logos. Soft greens and whites.
Shot on a neutral background with natural props relevant to the topic.`;

  let coverResult;
  const provider = String(process.env.FACTORY_IMAGE_PROVIDER || "local").toLowerCase();
  try {
    if (provider === "local") {
      await prepareLocalCoverGeneration();
      const reviewFile = await generateLocalCover({ slug, title });
      const publicFile = path.join(ROOT, "public/images", `${slug}.jpg`);
      const outputFile = path.join(ROOT, "outputs/images", `${slug}.jpg`);
      fs.mkdirSync(path.dirname(publicFile), { recursive: true });
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      convertToJpeg(reviewFile, publicFile);
      fs.copyFileSync(publicFile, outputFile);
      coverResult = { cover: `/images/${slug}.jpg`, coverImagePath: `public/images/${slug}.jpg` };
    } else if (provider === "openai") {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
      const isDalle3 = model === "dall-e-3";
      const size = process.env.OPENAI_IMAGE_SIZE || (isDalle3 ? "1792x1024" : "1536x1024");
      const quality = process.env.OPENAI_IMAGE_QUALITY || (isDalle3 ? "standard" : "medium");
      const format = isDalle3 ? {} : { output_format: "jpeg", output_compression: 82 };
      const imageResponse = await budgetedImage(client, { model, prompt, n: 1, size, quality, ...format }, { agent: AGENT, operation: "cover image" });
      coverResult = await saveGeneratedImage(imageResponse, slug, format.output_format === "jpeg" ? "jpg" : "png");
    } else if (provider === "fallback") {
      coverResult = writeFallbackCover(slug, title);
    } else {
      throw new Error(`Unknown FACTORY_IMAGE_PROVIDER: ${provider}`);
    }
    info(AGENT, `Saved to ${coverResult.coverImagePath}`);
  } catch (err) {
    warn(AGENT, `${provider} image generation failed: ${err.message}`);
    warn(AGENT, "Using the zero-cost SVG fallback; paid image generation is never triggered automatically.");
    coverResult = writeFallbackCover(slug, title);
  }

  const updated = writeContext({
    postData: { ...ctx.postData, cover: coverResult.cover },
    coverImagePath: coverResult.coverImagePath,
  });

  info(AGENT, "Cover path saved to context.");
  return updated;
}

if (process.argv[1].includes("image.mjs")) {
  await run();
}
