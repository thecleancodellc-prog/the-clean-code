// Scribe — generates the full blog post object from context (topic + product + research)
// Usage: node --env-file=.env.local scripts/agents/scribe.mjs
import OpenAI from "openai";
import { readContext, writeContext } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";
import { expandToLength, countWords } from "../lib/expand.mjs";
import { budgetedChat } from "../lib/api-budget.mjs";

const AGENT = "Scribe";

export const SYSTEM_PROMPT = `You are a content writer for "The Clean Code" — a wellness and eco-living blog focused on non-toxic, clean, and sustainable home living. Your tone is warm, practical, and direct. No fluff.

You write blog posts for a Next.js site. Return a single JSON object (no markdown, no code fences) with these fields:

{
  "title": "Post Title",
  "excerpt": "One or two sentence summary.",
  "categories": ["Category1", "Category2"],
  "featured": false,
  "seo": {
    "keywords": ["keyword1", "keyword2"],
    "metaTitle": "SEO Title | The Clean Code",
    "metaDescription": "Under 160 chars."
  },
  "content": "<p>Full HTML content...</p>"
}

Rules for the content field:
- Write 1100–1400 words of full HTML (deep, specific, practical; no filler)
- Use <h2> for section headings, <p>, <ul>/<li>, <strong>, <em>
- Internal links use class="text-green-400 hover:underline"
- Place exactly 3 ad blocks at natural breaks using this exact HTML (increment the slot number):
  <!-- 📍 Ad #1 -->
  <div class="my-8"><ins class="adsbygoogle" style="display:block; width:100%; min-height:90px" data-ad-client="ca-pub-4743638908421899" data-ad-slot="6007008001" data-ad-format="auto" data-full-width-responsive="true"></ins></div>
- End with a short motivational paragraph using class="mt-6 italic text-white/70"
- Do NOT include the product spotlight in the content — it renders separately
- author is always { "name": "The Clean Code Team" }
- Categories must be 2–3 from: Cleaning, Home, Kitchen, Laundry, Health, DIY, Lifestyle, Eco-Living`;

export async function run() {
  const ctx = readContext();
  if (!ctx.topic) throw new Error("No topic in context. Run Scout first.");

  step(AGENT, `Writing post: "${ctx.topic}"`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const today = new Date().toISOString().split("T")[0];

  const model = process.env.OPENAI_WRITING_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
  const response = await budgetedChat(client, {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Today's date is ${today}. Write a blog post for The Clean Code.

Topic: "${ctx.topic}"
Slug (already determined): "${ctx.slug}"

Research notes to draw from:
${ctx.researchNotes}

Product spotlight (informational context only; do not link to it inside the article because it renders separately):
${ctx.product ? `${ctx.product.title} — ${ctx.product.description}` : "None"}

Do not invent internal URLs. If you include an internal shop link, it must use one of these exact product IDs:
hexclad-12, castiron-10, glass-storage, glass-spray-bottle, castile-soap, palm-pot-brushes, swedish-dishcloths, wool-dryer-balls, beeswax-wraps, bamboo-toothbrush, glass-spice-jars, lecdura-glass-diffuser.

Avoid medical, veterinary, child-safety, chemical-safety, food-safety, fire-safety, or environmental-certification claims unless the research notes contain a credible source supporting the exact claim. Never describe essential oils as categorically pet-safe and never recommend vinegar as an aquarium dechlorinator.

Return only valid JSON — no markdown, no code fences.`,
      },
    ],
    response_format: { type: "json_object" },
  }, { agent: AGENT, operation: "article draft", reserveUSD: 0.06 });

  const postData = JSON.parse(response.choices[0].message.content);
  postData.content = await expandToLength(client, postData, { minWords: 1000, targetWords: 1300, agent: AGENT, model });
  info(AGENT, `Length: ${countWords(postData.content)} words`);

  info(AGENT, `Title: "${postData.title}"`);
  info(AGENT, `Categories: ${postData.categories.join(", ")}`);

  const updated = writeContext({
    postData: {
      ...postData,
      slug: ctx.slug,
      date: today,
      author: { name: "The Clean Code Team" },
      cover: `/images/${ctx.slug}.jpg`,
      product: ctx.product || null,
    },
  });

  info(AGENT, "Post written and saved to context.");
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("scribe.mjs")) {
  await run();
}
