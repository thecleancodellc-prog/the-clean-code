#!/usr/bin/env node
// Social Command Center generator for The Clean Code.
// Creates platform-ready drafts and a posting queue from existing blog posts.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_FILE = path.join(ROOT, "data/posts.js");
const CONFIG_FILE = path.join(ROOT, "config/social-command-center.json");
const OUT_DIR = path.join(ROOT, "outputs/social-command-center");
const QUEUE_FILE = path.join(OUT_DIR, "queue.json");
const STATUS_FILE = path.join(OUT_DIR, "status.json");
const VISUAL_BRIEFS_FILE = path.join(OUT_DIR, "visual-briefs.json");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u00e2\u20ac[\u201d\u201c]/g, "-")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, '"')
    .replace(/\u00e2\u20ac\u009d/g, '"')
    .replace(/\u00e2\u20ac\u00a6/g, "...")
    .replace(/\u00e2\u20ac\u00a2/g, "-")
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac[\u00e2\u20ac\u009d\u00e2\u20ac\u0153]/g, "-")
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u201e\u00a2/g, "'")
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00c5\u201c/g, '"')
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u009d/g, '"')
    .replace(/\u00c2/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function stripHtml(value) {
  return cleanText(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " "));
}

function getString(block, key) {
  const re = new RegExp(key + "\\s*:\\s*([\"'])([\\s\\S]*?)(?<!\\\\)\\1");
  return cleanText(block.match(re)?.[2] || "");
}

function getTemplateField(block, key) {
  const idx = block.indexOf(key + ":");
  if (idx === -1) return "";
  const tick = block.indexOf("`", idx);
  if (tick === -1) return "";
  let escaped = false;
  for (let i = tick + 1; i < block.length; i++) {
    const ch = block[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === "`") return block.slice(tick + 1, i);
  }
  return "";
}

function getCategories(block) {
  const raw = block.match(/categories\s*:\s*\[([\s\S]*?)\]/)?.[1] || "";
  return [...raw.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
}

function extractPostBlocks(source) {
  const arrStart = source.indexOf("export const posts");
  const bracketStart = source.indexOf("[", arrStart);
  const blocks = [];
  let depth = 0, start = -1, inString = null, inTemplate = false, escaped = false;
  for (let i = bracketStart + 1; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if ((inString || inTemplate) && ch === "\\") { escaped = true; continue; }
    if (inString) { if (ch === inString) inString = null; continue; }
    if (inTemplate) { if (ch === "`") inTemplate = false; continue; }
    if (ch === '"' || ch === "'") { inString = ch; continue; }
    if (ch === "`") { inTemplate = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; continue; }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) { blocks.push(source.slice(start, i + 1)); start = -1; }
      continue;
    }
    if (depth === 0 && ch === "]") break;
  }
  return blocks;
}

function parsePosts() {
  const source = fs.readFileSync(POSTS_FILE, "utf8").replace(/^\uFEFF/, "");
  return extractPostBlocks(source).map((block, index) => {
    const content = getTemplateField(block, "content");
    const plain = stripHtml(content);
    const productBlock = block.match(/product\s*:\s*\{([\s\S]*?)\n\s*\},\n\s*content\s*:/)?.[1] || "";
    const affiliateUrl = getString(productBlock, "affiliateUrl");
    const productTitle = getString(productBlock, "title");
    const slug = getString(block, "slug") || `post-${index}`;
    return {
      slug,
      title: getString(block, "title"),
      excerpt: getString(block, "excerpt"),
      date: getString(block, "date"),
      cover: getString(block, "cover"),
      categories: getCategories(block),
      product: productTitle ? { title: productTitle, affiliateUrl } : null,
      productClean: Boolean(affiliateUrl && !/\/dp\/example/i.test(affiliateUrl)),
      words: plain.split(/\s+/).filter(Boolean).length,
      plain
    };
  });
}

function tips(post, count = 5) {
  return post.plain
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 45 && s.length <= 180 && !/adsbygoogle|data-ad/i.test(s))
    .slice(0, count);
}

function hashtags(post) {
  const base = ["CleanLiving", "NonToxicHome", "EcoFriendlyHome", "HealthyHome", "SustainableLiving"];
  const cats = post.categories.map(c => c.replace(/[^a-z0-9]/gi, "")).filter(Boolean).slice(0, 5);
  return [...new Set([...base, ...cats])].map(tag => `#${tag}`).join(" ");
}

function score(post) {
  let value = 0;
  if (post.cover) value += 20;
  if (post.productClean) value += 25;
  if (post.words >= 650) value += 20;
  if (/clean|non-toxic|bathroom|kitchen|laundry|air|baby|pest|zero-waste|plastic/i.test(post.slug + " " + post.title)) value += 20;
  return value;
}

function splitTitle(title) {
  const clean = cleanText(title);
  if (clean.length <= 34) return clean;
  return clean.replace(/\s+\([^)]*\)/g, "").slice(0, 48).trim();
}

function visualTheme(post) {
  const text = [post.slug, post.title, post.categories.join(" ")].join(" ").toLowerCase();
  if (/laundry|detergent|fabric/.test(text)) return { room: "laundry room", props: "glass jars, folded cotton towels, wool dryer balls, simple labels" };
  if (/kitchen|dish|pantry|food|water/.test(text)) return { room: "bright kitchen", props: "glass storage jars, wood brush, ceramic bowl, filtered water pitcher" };
  if (/bathroom|personal-care|soap/.test(text)) return { room: "minimal bathroom", props: "linen towels, amber bottle, plant, clean tile" };
  if (/bed|sleep|mattress|nursery|baby/.test(text)) return { room: "soft bedroom", props: "organic cotton bedding, soft natural light, neutral textures" };
  if (/garden|plant|pest|lawn|compost/.test(text)) return { room: "home garden", props: "plants, soil, terracotta pots, natural tools" };
  return { room: "clean modern home", props: "natural materials, greenery, glass, wood, white cotton" };
}

function visualBriefs(post, config) {
  const url = `${config.brand.siteUrl}/blog/${post.slug}`;
  const list = tips(post, 6);
  const theme = visualTheme(post);
  const title = splitTitle(post.title);
  const hook = list[0] || post.excerpt || post.title;
  const basePrompt = `Bright natural-light lifestyle photo for ${config.brand.name}, ${theme.room}, ${theme.props}, clean non-toxic home aesthetic, premium editorial blog style, airy composition, realistic photography, no logos, no fake labels, no medical claims`;
  const slides = [
    { slide: 1, role: "hook", text: title, visualDirection: `Hero shot in a ${theme.room} with clear negative space for text.` },
    ...list.slice(0, 5).map((tip, index) => ({
      slide: index + 2,
      role: "teaching point",
      text: tip,
      visualDirection: `Simple close-up showing one clean-living action or product-free habit related to: ${tip}`
    })),
    { slide: Math.min(list.length, 5) + 2, role: "call to action", text: "Save this guide", visualDirection: "Clean branded end card with The Clean Code and blog link reminder." }
  ];

  return {
    productionStatus: "brief_ready",
    subcontractors: {
      image: "shared-image-studio",
      video: "shared-video-studio",
      editor: "social-creative-director"
    },
    creativeRules: [
      "Use realistic home/lifestyle imagery, not generic abstract backgrounds.",
      "Avoid fear-based medical claims and before/after exaggeration.",
      "Keep text overlays short enough to read on a phone.",
      "Prefer blog URL traffic over direct Amazon pushing until products are verified."
    ],
    pinterestPin: {
      status: "needs_asset",
      size: "1000x1500",
      format: "single image pin",
      textOverlay: title,
      prompt: `${basePrompt}. Vertical Pinterest pin, strong top-third composition, useful clean home guide mood, space for headline overlay: "${title}".`,
      negativePrompt: "text artifacts, misspelled words, logos, clutter, harsh chemicals, medical imagery, people staring at camera, dark room",
      altText: `${post.title} clean living guide from The Clean Code`.slice(0, 500),
      destinationUrl: url,
      outputPath: `outputs/social-command-center/assets/${post.slug}/pinterest-pin.png`
    },
    instagramCarousel: {
      status: "needs_asset",
      size: "1080x1350",
      format: "carousel",
      slideCount: slides.length,
      coverPrompt: `${basePrompt}. Instagram carousel cover, premium clean-living educational post, headline space: "${title}".`,
      slides,
      outputPath: `outputs/social-command-center/assets/${post.slug}/instagram-carousel/`
    },
    shortVideo: {
      status: "needs_asset",
      size: "1080x1920",
      format: "Reel/TikTok short",
      duration: "25-35 seconds",
      hookText: hook.slice(0, 110),
      storyboard: [
        { seconds: "0-3", shot: `Fast satisfying reveal of ${theme.room}`, overlay: title, voiceover: `If you want a healthier home, start here: ${title}.` },
        ...list.slice(0, 3).map((tip, index) => ({
          seconds: `${3 + index * 7}-${10 + index * 7}`,
          shot: `Close-up clean-living demonstration for point ${index + 1}`,
          overlay: tip.slice(0, 58),
          voiceover: tip
        })),
        { seconds: "final 3", shot: "End card with article cover and clean branded background", overlay: "Full guide on The Clean Code", voiceover: "Save this and read the full guide on The Clean Code." }
      ],
      bRollChecklist: [theme.room, theme.props, "hands-only demonstration", "clean close-ups", "final blog preview"],
      outputPath: `outputs/social-command-center/assets/${post.slug}/short-video.mp4`
    }
  };
}

function drafts(post, config) {
  const url = `${config.brand.siteUrl}/blog/${post.slug}`;
  const list = tips(post);
  const disclosure = post.productClean ? "Affiliate note: this post may contain affiliate links." : "";
  const hook = post.title.replace(/^(how to|the|a)\s+/i, "");
  return {
    pinterest: {
      status: "draft",
      title: post.title.slice(0, 100),
      description: `${post.excerpt || list[0] || post.title} Save this clean-living guide for practical non-toxic home ideas. ${disclosure}`.trim().slice(0, 800),
      link: url,
      image: post.cover,
      altText: `${post.title} - The Clean Code clean living guide`.slice(0, 500),
      board: "Clean Living Home"
    },
    instagram: {
      status: "draft",
      format: "carousel",
      caption: [`${post.title}`, "", list.map((tip, i) => `${i + 1}. ${tip}`).join("\n"), "", "Save this for your next home reset.", disclosure, "", hashtags(post)].filter(Boolean).join("\n").slice(0, 2200),
      carouselSlides: [post.title, ...list.slice(0, 5), "Full guide on The Clean Code"]
    },
    tiktok: {
      status: "draft",
      format: "30-second short",
      script: [`HOOK: If you care about a healthier home, ${hook.toLowerCase()} matters more than you think.`, ...list.slice(0, 3).map((tip, i) => `POINT ${i + 1}: ${tip}`), "CTA: Follow The Clean Code for simple non-toxic home systems."].join("\n"),
      hashtags: ["#cleantok", "#nontoxicliving", "#healthyhome", "#ecohome", "#homehacks"]
    },
    facebook: {
      status: "draft",
      text: `${post.title}\n\n${post.excerpt || list[0] || ""}\n\nRead it here: ${url}\n\n${disclosure}`.trim()
    }
  };
}

const config = readJson(CONFIG_FILE, { brand: { siteUrl: "https://thecleancode.com" }, platforms: {} });
const existing = readJson(QUEUE_FILE, []);
const existingBySlug = new Map(existing.map(item => [item.slug, item]));
const queue = parsePosts().map(post => {
  const previous = existingBySlug.get(post.slug);
  return {
    id: `social-${post.slug}`,
    slug: post.slug,
    title: post.title,
    date: post.date,
    score: score(post),
    status: previous?.status || "needs_review",
    priority: post.productClean ? "revenue" : "traffic",
    blockers: [!post.productClean ? "product_not_ready_for_affiliate_push" : null, post.words < 650 ? "thin_post" : null, !post.cover ? "missing_cover" : null].filter(Boolean),
    platforms: drafts(post, config),
    visuals: previous?.visuals?.productionStatus === "approved" ? previous.visuals : visualBriefs(post, config),
    updatedAt: new Date().toISOString()
  };
}).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
fs.writeFileSync(VISUAL_BRIEFS_FILE, JSON.stringify(queue.map(item => ({
  slug: item.slug,
  title: item.title,
  priority: item.priority,
  blockers: item.blockers,
  visuals: item.visuals
})), null, 2), "utf8");

const counts = {
  total: queue.length,
  ready: queue.filter(item => item.blockers.length === 0).length,
  needsReview: queue.filter(item => item.status === "needs_review").length,
  blocked: queue.filter(item => item.blockers.length > 0).length,
  revenueReady: queue.filter(item => item.priority === "revenue" && item.blockers.length === 0).length,
  visualBriefs: queue.filter(item => item.visuals?.productionStatus === "brief_ready").length,
  visualAssetsNeeded: queue.filter(item => item.visuals?.pinterestPin?.status === "needs_asset" || item.visuals?.instagramCarousel?.status === "needs_asset" || item.visuals?.shortVideo?.status === "needs_asset").length
};

const status = {
  generatedAt: new Date().toISOString(),
  businessId: "the-clean-code",
  socialStatus: counts.ready ? "ready_for_review" : "needs_cleanup",
  accounts: config.platforms,
  counts,
  topQueue: queue.slice(0, 12).map(item => ({ slug: item.slug, title: item.title, score: item.score, priority: item.priority, blockers: item.blockers })),
  recommendedNextActions: [
    "Review top revenue-ready Pinterest and Instagram drafts.",
    "Send the matching visual briefs to Image Studio / Video Studio before posting.",
    "Post manually first so the voice and visuals stay high quality.",
    "Replace placeholder Amazon products before pushing product-heavy posts.",
    "Connect APIs after the manual workflow is reliable."
  ]
};
fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");

console.log(`Social queue written: ${QUEUE_FILE}`);
console.log(`Social status written: ${STATUS_FILE}`);
console.log(`Visual briefs written: ${VISUAL_BRIEFS_FILE}`);
console.log(`Ready posts: ${counts.ready}/${counts.total}`);
console.log(`Revenue-ready posts: ${counts.revenueReady}`);