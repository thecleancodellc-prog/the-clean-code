import assert from "node:assert/strict";
import { isTopicRepeat } from "./lib/topic-overlap.mjs";
import { isProductRelevant } from "./agents/amazon.mjs";
import { hasAuthoritativeSource, requiresAuthoritativeSource } from "./agents/fact-checker.mjs";

const existingGym = {
  slug: "green-home-gym-ideas",
  title: "Creating a Sustainable, Non-Toxic Home Gym: Equipment and Practices",
  seo: { keywords: ["green home gym", "non-toxic gym equipment"] },
  content: "<h2>Choosing Safe Gym Flooring</h2><h2>Equipment and Ventilation</h2>",
};
assert.equal(isTopicRepeat({ title: "How to Build Sustainable Non-Toxic Home Gym Flooring", slug: "sustainable-non-toxic-home-gym-flooring" }, existingGym), true);
assert.equal(isTopicRepeat({ title: "Refillable Cleaning Concentrates for Apartments", slug: "refillable-cleaning-concentrates" }, existingGym), false);

assert.equal(isProductRelevant("sustainable non-toxic home gym flooring", "Journey to a Non-Toxic Home: A Room-by-Room Guide"), false);
assert.equal(isProductRelevant("sustainable non-toxic home gym flooring", "Natural Rubber Gym Flooring Tiles"), true);
assert.equal(isProductRelevant("eco-friendly aquarium setup", "Aqua Natural Substrate Sugar White Sand"), true);

assert.equal(requiresAuthoritativeSource("Low-VOC flooring can affect indoor air quality. Look for GREENGUARD certification."), true);
assert.equal(hasAuthoritativeSource([{ url: "https://www.epa.gov/indoor-air-quality-iaq" }]), true);
assert.equal(hasAuthoritativeSource([{ url: "https://some-flooring-store.example/blog" }]), false);
console.log("Agent guard tests passed.");
