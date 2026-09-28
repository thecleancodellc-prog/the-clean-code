import assert from "node:assert/strict";
import { findBrokenShopTargets, findKnownSafetyIssues, inspectPost } from "./lib/content-quality.mjs";
import { posts } from "../data/posts.js";

const ads = '<ins class="adsbygoogle"></ins>'.repeat(3);
const base = { title: "Test", slug: "test", content: `<p>Useful general advice.</p>${ads}` };

assert.deepEqual(findBrokenShopTargets('<a href="/shop/castile-soap">ok</a>'), []);
assert.deepEqual(findBrokenShopTargets('<a href="/shop/not-a-product">bad</a>'), ["not-a-product"]);
assert.equal(findKnownSafetyIssues("Use vinegar to remove chlorine from aquarium water.").length, 1);
assert.equal(findKnownSafetyIssues("Lavender essential oil is a pet-safe fragrance.").length, 1);
assert.equal(inspectPost(base).ok, true);
assert.equal(inspectPost({ ...base, product: { source: "ai-suggested" } }).ok, false);

const existingFailures = posts
  .map((post) => ({ slug: post.slug, ...inspectPost(post) }))
  .filter((result) => !result.ok);
assert.deepEqual(existingFailures, [], `Existing post quality failures:\n${JSON.stringify(existingFailures, null, 2)}`);

console.log(`Content quality tests passed for ${posts.length} existing posts.`);
