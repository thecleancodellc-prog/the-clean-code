// Image — generates a cover image via DALL-E 3 and saves to public/images/
// Usage: node --env-file=.env.local scripts/agents/image.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info, warn } from "../lib/log.mjs";

const AGENT = "Image";

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const { slug, title } = ctx.postData;
  step(AGENT, `Generating cover image for: "${title}"`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Clean, bright lifestyle photography for a wellness blog article titled "${title}".
Natural light, eco-friendly aesthetic, minimal and modern composition.
No text, no people, no logos. Soft greens and whites.
Shot on a neutral background with natural props relevant to the topic.`;

  const imageResponse = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1792x1024",
    quality: "standard",
  });

  const imageUrl = imageResponse.data[0].url;
  info(AGENT, "Image generated. Downloading...");

  // Download and save to public/images/
  const imgDir = path.join(ROOT, "public/images");
  fs.mkdirSync(imgDir, { recursive: true });

  const destPath = path.join(imgDir, `${slug}.jpg`);
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  info(AGENT, `Saved to public/images/${slug}.jpg`);

  // Also save to outputs/images/ for reference
  const outDir = path.join(ROOT, "outputs/images");
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(destPath, path.join(outDir, `${slug}.jpg`));

  const updated = writeContext({
    postData: { ...ctx.postData, cover: `/images/${slug}.jpg` },
    coverImagePath: `public/images/${slug}.jpg`,
  });

  info(AGENT, "Cover path saved to context.");
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("image.mjs")) {
  await run();
}
