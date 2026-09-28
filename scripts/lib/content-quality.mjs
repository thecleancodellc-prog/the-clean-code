import { products } from "../../data/products.js";

const VALID_PRODUCT_IDS = new Set(products.map((product) => product.id));

const SAFETY_RULES = [
  {
    id: "vinegar-dechlorinator",
    pattern: /(?:vinegar.{0,140}(?:dechlorinat|remove chlorine)|(?:dechlorinat|remove chlorine).{0,140}vinegar)/i,
    message: "Vinegar must not be recommended as an aquarium dechlorinator.",
  },
  {
    id: "pet-safe-essential-oil",
    pattern: /(?:pet[- ]safe.{0,140}(?:essential oil|lavender)|(?:essential oil|lavender).{0,140}pet[- ]safe)/i,
    message: "Essential oils must not be described categorically as pet-safe.",
  },
];

export function extractShopTargets(html) {
  return [...String(html || "").matchAll(/href=["']\/shop\/([^"'?#/]+)[^"']*["']/gi)]
    .map((match) => match[1]);
}

export function findBrokenShopTargets(html) {
  return [...new Set(extractShopTargets(html).filter((id) => !VALID_PRODUCT_IDS.has(id)))];
}

export function findKnownSafetyIssues(html) {
  return SAFETY_RULES
    .filter((rule) => rule.pattern.test(String(html || "")))
    .map(({ id, message }) => ({ id, message }));
}

export function inspectPost(post) {
  const issues = [];
  const content = String(post?.content || "");
  const adCount = (content.match(/adsbygoogle/g) || []).length;

  if (!post?.title?.trim()) issues.push("Post title is missing.");
  if (!post?.slug?.trim()) issues.push("Post slug is missing.");
  if (!content.trim()) issues.push("Post content is missing.");
  if (adCount !== 3) issues.push(`Post must contain exactly 3 ad blocks; found ${adCount}.`);

  const brokenTargets = findBrokenShopTargets(content);
  if (brokenTargets.length) {
    issues.push(`Unknown internal shop target(s): ${brokenTargets.join(", ")}.`);
  }

  for (const issue of findKnownSafetyIssues(content)) issues.push(issue.message);

  if (post?.product?.source === "ai-suggested") {
    issues.push("AI-suggested Amazon products are not verified and cannot be published.");
  }

  return { ok: issues.length === 0, issues, brokenTargets, adCount };
}

export function assertPostQuality(post) {
  const result = inspectPost(post);
  if (!result.ok) throw new Error(`Content quality gate failed: ${result.issues.join(" ")}`);
  return result;
}

export const validProductIds = Object.freeze([...VALID_PRODUCT_IDS]);
