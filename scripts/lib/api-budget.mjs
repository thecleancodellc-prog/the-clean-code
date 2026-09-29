import fs from "fs";
import path from "path";
import { ROOT } from "./context.mjs";

const LEDGER_FILE = path.join(ROOT, "logs", "openai-usage.json");
const DEFAULT_RUN_BUDGET = 0.35;
const DEFAULT_MONTHLY_BUDGET = 10;

const MODEL_PRICES = {
  "gpt-4o": { input: 2.5, cached: 1.25, output: 10 },
  "gpt-4.1-mini": { input: 0.4, cached: 0.1, output: 1.6 },
};

let runId = null;
let runCost = 0;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function readLedger() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_FILE, "utf8"));
    return Array.isArray(parsed.entries) ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeLedger(ledger) {
  fs.mkdirSync(path.dirname(LEDGER_FILE), { recursive: true });
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2) + "\n", "utf8");
}

function monthlyCost(ledger = readLedger()) {
  const month = monthKey();
  return ledger.entries
    .filter((entry) => String(entry.timestamp || "").startsWith(month))
    .reduce((total, entry) => total + positiveNumber(entry.estimatedCostUSD, 0), 0);
}

function limits() {
  return {
    run: positiveNumber(process.env.OPENAI_RUN_BUDGET_USD, DEFAULT_RUN_BUDGET),
    month: positiveNumber(process.env.OPENAI_MONTHLY_BUDGET_USD, DEFAULT_MONTHLY_BUDGET),
  };
}

function modelPrice(model) {
  // Unknown models use the higher known rate so the local estimate fails conservatively.
  return MODEL_PRICES[model] || MODEL_PRICES["gpt-4o"];
}

function usageTokens(usage = {}) {
  return {
    input: usage.prompt_tokens ?? usage.input_tokens ?? 0,
    output: usage.completion_tokens ?? usage.output_tokens ?? 0,
    cached: usage.prompt_tokens_details?.cached_tokens ?? usage.input_tokens_details?.cached_tokens ?? 0,
  };
}

export function estimateTextCost(model, usage = {}) {
  const price = modelPrice(model);
  const tokens = usageTokens(usage);
  const regularInput = Math.max(0, tokens.input - tokens.cached);
  return ((regularInput * price.input) + (tokens.cached * price.cached) + (tokens.output * price.output)) / 1_000_000;
}

function imageEstimate({ model, size, quality }) {
  if (!String(model).startsWith("gpt-image-1")) return 0.25;
  const portraitOrLandscape = size === "1024x1536" || size === "1536x1024";
  const table = portraitOrLandscape
    ? { low: 0.016, medium: 0.063, high: 0.25, auto: 0.063 }
    : { low: 0.011, medium: 0.042, high: 0.167, auto: 0.042 };
  return table[quality] ?? table.medium;
}

export function startOpenAIRun(id = `run-${Date.now()}`) {
  runId = id;
  runCost = 0;
  return getOpenAIUsageSummary();
}

export function assertOpenAIBudget(label, reserveUSD) {
  const reserve = positiveNumber(reserveUSD, 0);
  const ledger = readLedger();
  const spentThisMonth = monthlyCost(ledger);
  const cap = limits();
  if (runCost + reserve > cap.run + 1e-9) {
    throw new Error(`OpenAI run budget would be exceeded by ${label}: $${(runCost + reserve).toFixed(4)} > $${cap.run.toFixed(2)}.`);
  }
  if (spentThisMonth + reserve > cap.month + 1e-9) {
    throw new Error(`OpenAI monthly local budget would be exceeded by ${label}: $${(spentThisMonth + reserve).toFixed(4)} > $${cap.month.toFixed(2)}.`);
  }
}

export function recordOpenAIUsage({ agent, operation, model, usage, estimatedCostUSD, webSearchCalls = 0 }) {
  const tokenCost = usage ? estimateTextCost(model, usage) : 0;
  const cost = positiveNumber(estimatedCostUSD, tokenCost) + (webSearchCalls * 0.01);
  runCost += cost;
  const ledger = readLedger();
  ledger.entries.push({
    timestamp: new Date().toISOString(),
    runId: runId || "standalone",
    agent,
    operation,
    model,
    usage: usageTokens(usage),
    webSearchCalls,
    estimatedCostUSD: Number(cost.toFixed(8)),
  });
  writeLedger(ledger);
  return cost;
}

export async function budgetedChat(client, params, { agent, operation = "chat", reserveUSD = 0.05 } = {}) {
  assertOpenAIBudget(`${agent} ${operation}`, reserveUSD);
  const response = await client.chat.completions.create(params);
  recordOpenAIUsage({ agent, operation, model: params.model, usage: response.usage });
  return response;
}

export async function budgetedResponse(client, params, { agent, operation = "response", reserveUSD = 0.05 } = {}) {
  assertOpenAIBudget(`${agent} ${operation}`, reserveUSD);
  const response = await client.responses.create(params);
  const webSearchCalls = (response.output || []).filter((item) => item.type === "web_search_call").length;
  recordOpenAIUsage({ agent, operation, model: params.model, usage: response.usage, webSearchCalls });
  return response;
}

export async function budgetedImage(client, params, { agent, operation = "image" } = {}) {
  const estimate = imageEstimate(params);
  assertOpenAIBudget(`${agent} ${operation}`, estimate);
  const response = await client.images.generate(params);
  recordOpenAIUsage({ agent, operation, model: params.model, estimatedCostUSD: estimate });
  return response;
}

export function getOpenAIUsageSummary() {
  const ledger = readLedger();
  const cap = limits();
  return {
    runId,
    runCostUSD: Number(runCost.toFixed(8)),
    monthlyCostUSD: Number(monthlyCost(ledger).toFixed(8)),
    runBudgetUSD: cap.run,
    monthlyBudgetUSD: cap.month,
    ledgerFile: path.relative(ROOT, LEDGER_FILE).replaceAll("\\", "/"),
  };
}

export function formatOpenAIUsageSummary(summary = getOpenAIUsageSummary()) {
  return `estimated $${summary.runCostUSD.toFixed(4)} this run / $${summary.monthlyCostUSD.toFixed(4)} this month (caps: $${summary.runBudgetUSD.toFixed(2)} run, $${summary.monthlyBudgetUSD.toFixed(2)} month)`;
}
