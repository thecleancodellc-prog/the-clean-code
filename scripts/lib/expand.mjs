// Length enforcement for generated posts. gpt-4o in JSON mode reliably undershoots requested length
// (asked for 800–1200, returns ~500), so asking harder doesn't work — expanding a draft does.
import { step, warn } from "./log.mjs";
import { budgetedChat } from "./api-budget.mjs";

export const countWords = (html) => String(html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
const adCount = (html) => (String(html || "").match(/adsbygoogle/g) || []).length;

export async function expandToLength(client, { title, content }, { minWords = 1000, targetWords = 1300, rounds = 2, agent = "Expand", model = process.env.OPENAI_WRITING_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini" } = {}) {
  let current = content;
  for (let round = 1; round <= rounds && countWords(current) < minWords; round++) {
    step(agent, `Draft is ${countWords(current)} words; expanding (round ${round}) toward ${targetWords}...`);
    const res = await budgetedChat(client, {
      model,
      messages: [
        {
          role: "system",
          content: "You are an editor for The Clean Code, a non-toxic, eco-friendly home living blog. Tone: warm, practical, direct, no fluff. You expand drafts with genuinely useful detail, never filler.",
        },
        {
          role: "user",
          content: `This article "${title}" is ${countWords(current)} words. Rewrite it to about ${targetWords} words of body text.

- Deepen every <h2> section: concrete steps, what to look for when buying, specific materials/ingredients, common mistakes, quick-start checklists.
- You may add 1–2 new sections (for example "Common Mistakes" or a short FAQ with <h3> questions).
- Keep all existing HTML conventions, internal links, and the closing motivational paragraph.
- Keep the 3 ad block snippets exactly as they are, at natural breaks.
- Do not repeat yourself or pad with generic statements.

Return only JSON: {"content": "<full HTML>"}

${current}`,
        },
      ],
      response_format: { type: "json_object" },
    }, { agent, operation: `article expansion ${round}`, reserveUSD: 0.06 });
    const next = JSON.parse(res.choices[0].message.content).content;
    if (countWords(next) > countWords(current) && adCount(next) === adCount(current)) current = next;
    else warn(agent, `Expansion round ${round} was rejected (shorter or ad blocks changed).`);
  }
  return current;
}
