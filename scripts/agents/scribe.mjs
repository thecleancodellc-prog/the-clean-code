// Scribe — generates the full blog post object from context (topic + product + research)
// Usage: node --env-file=.env.local scripts/agents/scribe.mjs
import OpenAI from "openai";
import { readContext, writeContext } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Scribe";

const SYSTEM_PROMPT = `You are a content writer for "The Clean Code" — a wellness and eco-living blog focused on non-toxic, clean, and sustainable home living. Your tone is warm, practical, and direct. No fluff.

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
- Write 800–1200 words of full HTML
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

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Today's date is ${today}. Write a blog post for The Clean Code.

Topic: "${ctx.topic}"
Slug (already determined): "${ctx.slug}"

Research notes to draw from:
${ctx.researchNotes}

Product spotlight (reference it naturally in the content with a link to /shop/${ctx.slug} if relevant):
${ctx.product ? `${ctx.product.title} — ${ctx.product.description}` : "None"}

Return only valid JSON — no markdown, no code fences.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const postData = JSON.parse(response.choices[0].message.content);

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
