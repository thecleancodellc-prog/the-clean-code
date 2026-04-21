// Scout — researches trending topics and picks the best one for a new post
// Usage: node --env-file=.env.local scripts/agents/scout.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Scout";

export async function run() {
  step(AGENT, "Researching trending topics in clean/eco living...");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Load existing slugs so Scout avoids duplicates
  const postsSource = fs.readFileSync(path.join(ROOT, "data/posts.js"), "utf8");
  const existingSlugs = [...postsSource.matchAll(/slug:\s*["']([^"']+)["']/g)].map(m => m[1]);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a content strategist for "The Clean Code" — a wellness blog about non-toxic, eco-friendly, sustainable home living. You identify high-value blog topics that are practical, search-friendly, and not yet covered.`,
      },
      {
        role: "user",
        content: `Generate 5 compelling blog topic ideas for our clean-living blog. Each should be specific, actionable, and SEO-friendly.

Existing topics to avoid (already published):
${existingSlugs.map(s => `- ${s}`).join("\n")}

Respond with a JSON object:
{
  "topics": [
    { "title": "...", "slug": "...", "reason": "Why this topic performs well" }
  ],
  "winner": 0
}

Pick the "winner" index — the single best topic to publish next based on search demand and reader value.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const winner = parsed.topics[parsed.winner];

  info(AGENT, `Selected topic: "${winner.title}"`);
  info(AGENT, `Reason: ${winner.reason}`);

  // Research the chosen topic in depth
  step(AGENT, "Gathering research notes...");
  const researchResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Research this topic thoroughly and summarize the most accurate, useful, and actionable information a reader would want to know:\n\n"${winner.title}"\n\nFocus on facts, tips, health/safety angles, and practical advice relevant to eco-friendly home living.`,
      },
    ],
  });

  const researchNotes = researchResponse.choices[0].message.content;

  const ctx = writeContext({
    topic: winner.title,
    slug: winner.slug,
    topicReason: winner.reason,
    researchNotes,
    runDate: new Date().toISOString(),
  });

  info(AGENT, "Context saved.");
  return ctx;
}

// Standalone entry point
if (process.argv[1].includes("scout.mjs")) {
  await run();
}
