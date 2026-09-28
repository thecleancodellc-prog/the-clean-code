// One-time repair for legacy article links and known unsafe language.
import fs from "fs";
import path from "path";
import { ROOT } from "./lib/context.mjs";
import { validProductIds } from "./lib/content-quality.mjs";

const postsFile = path.join(ROOT, "data", "posts.js");
const validIds = new Set(validProductIds);
let source = fs.readFileSync(postsFile, "utf8");
let repairedLinks = 0;

source = source.replace(/href=(["'])\/shop\/([^"'?#/]+)([^"']*)\1/gi, (full, quote, id) => {
  if (validIds.has(id)) return full;
  repairedLinks += 1;
  return `href=${quote}/shop${quote}`;
});

const replacements = [
  [
    "Vinegar or vitamin C solutions can naturally remove chlorine from tap water without resorting to harsh chemical treatments.",
    "Use a labeled aquarium water conditioner that treats both chlorine and chloramine, and follow its dosing instructions before adding tap water to the tank.",
  ],
  [
    "Choose natural methods to dechlorinate water, such as vinegar or vitamin C.",
    "Treat replacement water with a labeled aquarium conditioner that handles chlorine and chloramine.",
  ],
  [
    "Blend one cup of vinegar with a gallon of warm water, adding essential oils like lavender for a pet-safe fragrance. Ensure oils are diluted properly, as even natural elements can sometimes irritate pets.",
    "Blend one cup of vinegar with a gallon of warm water, keep pets away while cleaning, and let the floor dry fully before they return. Skip essential oils unless your veterinarian has confirmed the specific product and exposure are appropriate for your pet.",
  ],
  ["Let’s delve into", "Let’s look at"],
  ["Let's delve into", "Let's look at"],
  ["we delve into", "we examine"],
  ["In today's world,", "Today,"],
  ["In today’s world,", "Today,"],
  ["game-changer", "especially useful option"],
];

const applied = [];
for (const [before, after] of replacements) {
  const count = source.split(before).length - 1;
  if (!count) continue;
  source = source.split(before).join(after);
  applied.push({ before, count });
}

fs.writeFileSync(postsFile, source, "utf8");
console.log(`Repaired ${repairedLinks} broken shop link occurrence(s).`);
console.log(`Applied ${applied.reduce((sum, item) => sum + item.count, 0)} safety/style replacement(s).`);
