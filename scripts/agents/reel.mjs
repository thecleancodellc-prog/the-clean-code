// Reel — generates a short-form video script (TikTok / Instagram Reels)
// Usage: node --env-file=.env.local scripts/agents/reel.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Reel";

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const { title, slug, categories } = ctx.postData;
  step(AGENT, `Writing reel script for: "${title}"`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You write short-form video scripts for "The Clean Code" — an eco-friendly, non-toxic home living brand on TikTok and Instagram Reels. Scripts should be punchy, fast-paced, conversational, and hook viewers in the first 3 seconds. Use [VISUAL] cues and [TEXT OVERLAY] notes so the creator knows exactly what to film.`,
      },
      {
        role: "user",
        content: `Write a 30–45 second video script for this blog post topic:

Title: "${title}"
Categories: ${categories.join(", ")}
Research summary: ${ctx.researchNotes?.slice(0, 800) ?? ""}

Format the script like this:
---
HOOK (0–3s): [spoken line]
[VISUAL]: what to film

POINT 1 (3–12s): [spoken line]
[VISUAL]: what to film
[TEXT OVERLAY]: optional text

... continue for all points ...

CTA (final 3s): [spoken line + call to action]
[TEXT OVERLAY]: "Link in bio" or similar
---

Also include:
- Suggested trending audio style (e.g., "upbeat lo-fi", "satisfying ASMR sounds")
- 5 recommended hashtags for reach`,
      },
    ],
  });

  const script = response.choices[0].message.content;

  const outDir = path.join(ROOT, "outputs/reels");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${slug}-reel.txt`);
  const content = [
    `REEL SCRIPT — ${title}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    script,
  ].join("\n");

  fs.writeFileSync(outFile, content, "utf8");
  info(AGENT, `Saved to outputs/reels/${slug}-reel.txt`);

  const updated = writeContext({ reelScript: script, reelFile: `outputs/reels/${slug}-reel.txt` });
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("reel.mjs")) {
  await run();
}
