// Spark — generates social media captions for the published post
// Usage: node --env-file=.env.local scripts/agents/spark.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";
import { budgetedChat } from "../lib/api-budget.mjs";

const AGENT = "Spark";

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const { title, excerpt, slug, categories } = ctx.postData;
  step(AGENT, `Writing social captions for: "${title}"`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await budgetedChat(client, {
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `You write social media content for "The Clean Code" — an eco-friendly, non-toxic home living brand. Voice: warm, empowering, real. No corporate speak. Use emojis naturally but don't overload.`,
      },
      {
        role: "user",
        content: `Write social media content for this blog post:

Title: "${title}"
Excerpt: "${excerpt}"
Categories: ${categories.join(", ")}
Post URL: https://www.thecleancode.co/blog/${slug}

Return JSON with:
{
  "instagram": "Caption (150–220 words) with 15–20 hashtags at the end",
  "twitter": "Tweet thread — 3 tweets max, each under 280 chars, numbered 1/3, 2/3, 3/3",
  "pinterest": "Pinterest description (100–150 words, keyword-rich, no hashtags)"
}`,
      },
    ],
    response_format: { type: "json_object" },
  }, { agent: AGENT, operation: "social captions", reserveUSD: 0.02 });

  const captions = JSON.parse(response.choices[0].message.content);

  const outDir = path.join(ROOT, "outputs/social");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${slug}-social.txt`);
  const content = [
    `SOCIAL CONTENT — ${title}`,
    `Generated: ${new Date().toISOString()}`,
    `URL: https://www.thecleancode.co/blog/${slug}`,
    "",
    "═══════════════════════════════════",
    "INSTAGRAM",
    "═══════════════════════════════════",
    captions.instagram,
    "",
    "═══════════════════════════════════",
    "TWITTER / X",
    "═══════════════════════════════════",
    captions.twitter,
    "",
    "═══════════════════════════════════",
    "PINTEREST",
    "═══════════════════════════════════",
    captions.pinterest,
  ].join("\n");

  fs.writeFileSync(outFile, content, "utf8");
  info(AGENT, `Saved to outputs/social/${slug}-social.txt`);

  const updated = writeContext({ socialContent: captions, socialFile: `outputs/social/${slug}-social.txt` });
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("spark.mjs")) {
  await run();
}
