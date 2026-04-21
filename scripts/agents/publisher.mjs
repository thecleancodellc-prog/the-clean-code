// Publisher — appends the completed post object from context into data/posts.js
// Usage: node --env-file=.env.local scripts/agents/publisher.mjs
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Publisher";
const POSTS_FILE = path.join(ROOT, "data/posts.js");

function serializePost(post) {
  const indent = "  ";
  const keywords = post.seo.keywords.map((k) => `"${k}"`).join(", ");
  const categories = post.categories.map((c) => `"${c}"`).join(", ");

  let productBlock = "";
  if (post.product) {
    productBlock =
      `${indent}product: {\n` +
      `${indent}  title: ${JSON.stringify(post.product.title)},\n` +
      `${indent}  image: ${JSON.stringify(post.product.image)},\n` +
      `${indent}  affiliateUrl: ${JSON.stringify(post.product.affiliateUrl)},\n` +
      `${indent}  description:\n${indent}    ${JSON.stringify(post.product.description)},\n` +
      `${indent}},\n`;
  }

  return (
    `\n\n  {\n` +
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
    productBlock +
    `${indent}content: \`\n${post.content}\n  \`,\n` +
    `},`
  );
}

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const post = ctx.postData;
  step(AGENT, `Publishing: "${post.title}" → data/posts.js`);

  let source = fs.readFileSync(POSTS_FILE, "utf8");
  const lastBracket = source.lastIndexOf("];");
  if (lastBracket === -1) throw new Error('Could not find closing "]; " in data/posts.js');

  const serialized = serializePost(post);
  const updated = source.slice(0, lastBracket) + serialized + "\n" + source.slice(lastBracket);
  fs.writeFileSync(POSTS_FILE, updated, "utf8");

  info(AGENT, `Post appended — slug: ${post.slug}`);

  const ctx2 = writeContext({ published: true, publishedSlug: post.slug });
  return ctx2;
}

// Standalone entry point
if (process.argv[1].includes("publisher.mjs")) {
  await run();
}
