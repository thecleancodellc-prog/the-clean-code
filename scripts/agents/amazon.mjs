// Amazon — suggests a relevant affiliate product for the current topic
// Usage: node --env-file=.env.local scripts/agents/amazon.mjs
import OpenAI from "openai";
import { readContext, writeContext } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Amazon";

export async function run() {
  const ctx = readContext();
  if (!ctx.topic) throw new Error("No topic in context. Run Scout first.");

  step(AGENT, `Finding affiliate product for: "${ctx.topic}"`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a product researcher for "The Clean Code" — an eco-friendly, non-toxic home living blog that earns via Amazon affiliate links. Suggest real, highly-rated products that are genuinely useful for the topic.`,
      },
      {
        role: "user",
        content: `Suggest the single best Amazon product to spotlight for this blog post topic: "${ctx.topic}"

The product should be:
- A real, well-reviewed product available on Amazon
- Non-toxic, eco-friendly, or natural where applicable
- Priced reasonably ($10–$60 range)
- Directly relevant to the post topic

Respond with JSON only:
{
  "title": "Product Name",
  "brand": "Brand Name",
  "image": "/images/products/[url-friendly-product-name].jpg",
  "affiliateUrl": "https://www.amazon.com/dp/[ASIN]?tag=thecleancode-20",
  "description": "1–2 sentence pitch explaining why this product fits the post and why readers should want it.",
  "price": "$XX.XX",
  "asin": "XXXXXXXXXX"
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const product = JSON.parse(response.choices[0].message.content);

  info(AGENT, `Product: ${product.title} (${product.price})`);
  info(AGENT, `ASIN: ${product.asin}`);

  const updated = writeContext({ product });
  info(AGENT, "Product saved to context.");
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("amazon.mjs")) {
  await run();
}
