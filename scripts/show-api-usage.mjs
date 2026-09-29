import { formatOpenAIUsageSummary, getOpenAIUsageSummary } from "./lib/api-budget.mjs";

console.log(`OpenAI API usage: ${formatOpenAIUsageSummary(getOpenAIUsageSummary())}`);
console.log("This is a local estimate starting when tracking was installed; confirm actual charges at https://platform.openai.com/usage");
