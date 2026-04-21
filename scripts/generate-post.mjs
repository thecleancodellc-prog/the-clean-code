#!/usr/bin/env node
// Usage: node --env-file=.env.local scripts/generate-post.mjs "your topic here"

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_FILE = path.join(__dirname, "../data/posts.js");

const topic = process.argv[2];
if (!topic) {
  console.error("Error: provide a topic as the first argument.");
  console.error('  node scripts/generate-post.js "5 ways to detox your kitchen"');
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AD_SLOT_TEMPLATE = (n) =>
  `\n    <!-- 📍 Ad #${n} -->\n    <div class="my-8">\n      <ins class="adsbygoogle"\n        style="display:block; width:100%; min-height:90px"\n        data-ad-client="ca-pub-4743638908421899"\n        data-ad-slot="600700800${n}"\n        data-ad-format="auto"\n        data-full-width-responsive="true"></ins>\n    </div>\n`;

const SYSTEM_PROMPT = `You are a content writer for "The Clean Code" — a wellness and eco-living blog focused on non-toxic, clean, and sustainable home living. Your tone is warm, practical, and direct. No fluff.

You write blog posts for a Next.js site. Your job is to return a single JSON object (no markdown, no code fences) with the following fields:

{
  "slug": "url-friendly-slug",
  "title": "Post Title",
  "excerpt": "One or two sentence summary.",
  "date": "YYYY-MM-DD",   // today's date
  "categories": ["Category1", "Category2"],   // 2–3 from: Cleaning, Home, Kitchen, Laundry, Health, DIY, Lifestyle, Eco-Living
  "featured": false,
  "seo": {
    "keywords": ["keyword1", "keyword2"],   // 5–7 relevant keywords
    "metaTitle": "SEO Title | The Clean Code",
    "metaDescription": "Under 160 chars."
  },
  "product": {
    "title": "Product Name",
    "image": "/images/products/product-slug.jpg",
    "affiliateUrl": "https://www.amazon.com/dp/EXAMPLE?tag=thecleancode-20",
    "description": "1–2 sentence description of why this product fits the post."
  },
  "content": "<p>Full HTML content here...</p>"
}

Rules for the content field:
- Write 800–1200 words of full HTML (no wrapping backticks or code fences)
- Use <h2> for section headings, <p> for paragraphs, <ul>/<li> for lists, <strong> and <em> for emphasis
- Internal links use class="text-green-400 hover:underline" — link to /shop/[product-slug] or /blog/[related-slug] where relevant
- Place exactly 3 ad placeholder comments at natural breaks in the content. Use this exact HTML for each (increment the number):
  <!-- 📍 Ad #1 -->
  <div class="my-8"><ins class="adsbygoogle" style="display:block; width:100%; min-height:90px" data-ad-client="ca-pub-4743638908421899" data-ad-slot="6007008001" data-ad-format="auto" data-full-width-responsive="true"></ins></div>
- End with a short motivational closing paragraph using class="mt-6 italic text-white/70"
- Do NOT include the product spotlight in the content — it is rendered separately by the page component
- author is always: { "name": "The Clean Code Team" }
- cover image path follows the pattern: /images/[slug].jpg`;

async function researchAndGenerate(topic) {
  console.log(`\nResearching and writing post about: "${topic}"...\n`);

  // Step 1: research the topic
  const researchResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Research the following topic and summarize the most useful, accurate, and practical information a reader would want to know. Focus on facts, tips, and actionable advice. Topic: "${topic}"`,
      },
    ],
  });

  const research = researchResponse.choices[0].message.content;
  console.log("Research complete. Writing post...\n");

  // Step 2: generate the post object from the research
  const today = new Date().toISOString().split("T")[0];

  const writeResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Today's date is ${today}. Use the research below to write a blog post for The Clean Code about: "${topic}"\n\nResearch:\n${research}\n\nReturn only valid JSON — no markdown, no code fences.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = writeResponse.choices[0].message.content;
  let post;
  try {
    post = JSON.parse(raw);
  } catch {
    console.error("Failed to parse JSON response from OpenAI:");
    console.error(raw);
    process.exit(1);
  }

  // Always enforce author shape in case model drifts
  post.author = { name: "The Clean Code Team" };

  return post;
}

function serializePost(post) {
  // Serialize to JS object literal (not JSON) so it matches posts.js style
  const indent = "  ";

  const keywords = post.seo.keywords
    .map((k) => `"${k}"`)
    .join(", ");

  const categories = post.categories
    .map((c) => `"${c}"`)
    .join(", ");

  return `\n\n  {\n` +
    `${indent}slug: ${JSON.stringify(post.slug)},\n` +
    `${indent}title: ${JSON.stringify(post.title)},\n` +
    `${indent}excerpt:\n${indent}  ${JSON.stringify(post.excerpt)},\n` +
    `${indent}date: ${JSON.stringify(post.date)},\n` +
    `${indent}author: { name: "The Clean Code Team" },\n` +
    `${indent}cover: ${JSON.stringify(post.cover)},\n` +
    `${indent}featured: ${post.featured},\n` +
    `${indent}categories: [${categories}],\n` +
    `${indent}seo: {\n` +
    `${indent}  keywords: [${keywords}],\n` +
    `${indent}  metaTitle: ${JSON.stringify(post.seo.metaTitle)},\n` +
    `${indent}  metaDescription:\n${indent}    ${JSON.stringify(post.seo.metaDescription)},\n` +
    `${indent}},\n` +
    `${indent}product: {\n` +
    `${indent}  title: ${JSON.stringify(post.product.title)},\n` +
    `${indent}  image: ${JSON.stringify(post.product.image)},\n` +
    `${indent}  affiliateUrl: ${JSON.stringify(post.product.affiliateUrl)},\n` +
    `${indent}  description:\n${indent}    ${JSON.stringify(post.product.description)},\n` +
    `${indent}},\n` +
    `${indent}content: \`\n${post.content}\n  \`,\n` +
    `},`;
}

function appendToPostsFile(post) {
  let source = fs.readFileSync(POSTS_FILE, "utf8");

  // Find the closing bracket of the posts array and insert before it
  const lastBracket = source.lastIndexOf("];");
  if (lastBracket === -1) {
    throw new Error('Could not find closing "];\" in data/posts.js');
  }

  const serialized = serializePost(post);
  const updated =
    source.slice(0, lastBracket) + serialized + "\n" + source.slice(lastBracket);

  fs.writeFileSync(POSTS_FILE, updated, "utf8");
  console.log(`Post appended to data/posts.js`);
  console.log(`  slug:  ${post.slug}`);
  console.log(`  title: ${post.title}`);
}

const post = await researchAndGenerate(topic);
appendToPostsFile(post);
console.log("\nDone.");
