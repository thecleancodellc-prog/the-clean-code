import assert from "node:assert/strict";
import { budgetedChat, estimateTextCost, startOpenAIRun } from "./lib/api-budget.mjs";

assert.equal(estimateTextCost("gpt-4.1-mini", { input_tokens: 1_000_000, output_tokens: 0 }), 0.4);
assert.equal(estimateTextCost("gpt-4.1-mini", { input_tokens: 1_000_000, input_tokens_details: { cached_tokens: 1_000_000 }, output_tokens: 0 }), 0.1);
assert.equal(estimateTextCost("gpt-4o", { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 }), 12.5);
assert.equal(estimateTextCost("unknown-paid-model", { input_tokens: 1_000_000, output_tokens: 1_000_000 }), 12.5);

const previousRunBudget = process.env.OPENAI_RUN_BUDGET_USD;
process.env.OPENAI_RUN_BUDGET_USD = "0";
startOpenAIRun("budget-test");
let called = false;
const fakeClient = { chat: { completions: { create: async () => { called = true; } } } };
await assert.rejects(
  budgetedChat(fakeClient, { model: "gpt-4.1-mini" }, { agent: "Test", reserveUSD: 0.01 }),
  /run budget would be exceeded/
);
assert.equal(called, false);
if (previousRunBudget === undefined) delete process.env.OPENAI_RUN_BUDGET_USD;
else process.env.OPENAI_RUN_BUDGET_USD = previousRunBudget;
console.log("API budget tests passed.");
