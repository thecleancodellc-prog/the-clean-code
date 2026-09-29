// Scout — researches trending topics and picks the best one for a new post
// Usage: node --env-file=.env.local scripts/agents/scout.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";
import { budgetedChat } from "../lib/api-budget.mjs";

const AGENT = "Scout";

export async function run() {
  step(AGENT, "Researching trending topics in clean/eco living...");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Load existing slugs so Scout avoids duplicates
  const postsSource = fs.readFileSync(path.join(ROOT, "data/posts.js"), "utf8");
  const existingSlugs = [...postsSource.matchAll(/slug:\s*["']([^"']+)["']/g)].map(m => m[1]);
  // Post titles only (product titles sit inside `product: {` blocks and are indented deeper).
  const existingTitles = [...postsSource.matchAll(/^\s{2}title:\s*"([^"]+)"/gm)].map(m => m[1]);

  // Topic check: slugs alone let "green-home-gym-ideas" and "affordable-non-toxic-home-gym" both through.
  const STOP = new Set("a an the and or for to of in on with your you how why what guide tips ways best top simple easy eco friendly non toxic sustainable green clean cleaner healthier healthy home homes living natural safe safer choices alternatives create creating make making beyond more less ideas practices budget affordable".split(" "));
  const topicWords = (s) => new Set((String(s).toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(ing|ies|es|s)$/, "")));
  const existingTopics = [...existingSlugs.map(s => s.replace(/-/g, " ")), ...existingTitles].map(topicWords);
  const overlapsExisting = (title) => {
    const words = topicWords(title);
    if (!words.size) return true;
    return existingTopics.some((ex) => {
      const shared = [...words].filter(w => ex.has(w)).length;
      return shared / Math.min(words.size, ex.size || 1) >= 0.6 && shared >= Math.min(2, words.size);
    });
  };

  const model = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
  const response = await budgetedChat(client, {
    model,
    messages: [
      {
        role: "system",
        content: `You are a content strategist for "The Clean Code" — a wellness blog about non-toxic, eco-friendly, sustainable home living. You identify high-value blog topics that are practical, search-friendly, and not yet covered.`,
      },
      {
        role: "user",
        content: `Generate 8 compelling blog topic ideas for our clean-living blog. Each should be specific, actionable, and SEO-friendly.

Every topic must cover a subject NOT already covered below. A new angle on an existing subject (for example
another home gym, laundry, nursery, or bathroom post) counts as a repeat — pick a genuinely different subject.

Already published (do not repeat these subjects):
${existingTitles.map(t => `- ${t}`).join("\n")}

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
  }, { agent: AGENT, operation: "topic selection", reserveUSD: 0.03 });

  const parsed = JSON.parse(response.choices[0].message.content);
  // Slug becomes a file name and part of a shell git commit message, so normalize it and never reuse one.
  const toSlug = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const candidates = (parsed.topics || []).map((t) => ({ ...t, slug: toSlug(t.slug || t.title) }));
  const winner = [candidates[parsed.winner], ...candidates].find((t) =>
    t?.slug && !existingSlugs.includes(t.slug) && !overlapsExisting(`${t.title} ${t.slug.replace(/-/g, " ")}`));
  if (!winner) throw new Error("Scout returned no topic that is new and doesn't repeat an existing post.");

  info(AGENT, `Selected topic: "${winner.title}"`);
  info(AGENT, `Reason: ${winner.reason}`);

  // Research the chosen topic in depth
  step(AGENT, "Gathering research notes...");
  const researchResponse = await budgetedChat(client, {
    model,
    messages: [
      {
        role: "user",
        content: `Research this topic thoroughly and summarize the most accurate, useful, and actionable information a reader would want to know:\n\n"${winner.title}"\n\nFocus on facts, tips, health/safety angles, and practical advice relevant to eco-friendly home living.`,
      },
    ],
  }, { agent: AGENT, operation: "topic research", reserveUSD: 0.03 });

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
