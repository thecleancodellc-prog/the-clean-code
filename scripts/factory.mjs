#!/usr/bin/env node
// Factory — master content pipeline
// Run once:      node --env-file=.env.local scripts/factory.mjs
// Run scheduler: node --env-file=.env.local scripts/factory.mjs --schedule
//
// Pipeline order: Scout → Amazon → Scribe → Image → Publisher → Spark → Reel → Mailer

import cron from "node-cron";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { clearContext, readContext, ROOT } from "./lib/context.mjs";
import { divider, step, info, error, done, warn } from "./lib/log.mjs";
import { logAction } from "./lib/logger.mjs";
import { formatOpenAIUsageSummary, getOpenAIUsageSummary, startOpenAIRun } from "./lib/api-budget.mjs";

const ZIOMEK_DIR = process.env.ZIOMEK_DIR ?? path.resolve(ROOT, "../ziomek-city");

// Windows absolute paths must be file:// URLs for ESM import(), or Node throws ERR_UNSUPPORTED_ESM_URL_SCHEME.
function importFromZiomek(relativePath) {
  return import(pathToFileURL(path.join(ZIOMEK_DIR, relativePath)).href);
}

// Improver lives in ziomek-city — import dynamically so TheCleanCode works standalone too.
// It executes Ollama-generated fix scripts, so it is opt-in: set ZIOMEK_IMPROVER=on in .env.local.
async function getImprover() {
  if (process.env.ZIOMEK_IMPROVER !== "on") return null;
  try {
    const mod = await importFromZiomek("scripts/lib/improver.mjs");
    return mod.runImprover;
  } catch (err) {
    warn("Improver", `Could not load improver.mjs: ${err.message}`);
    return null;
  }
}

// Notifier lives in ziomek-city — optional, degrades gracefully
async function getNotifier() {
  try {
    return await importFromZiomek("scripts/notifier.mjs");
  } catch (err) {
    warn("Factory", `Notifier unavailable: ${err.message}`);
    return null;
  }
}
import {
  initFactoryRun,
  setAgentRunning,
  setAgentComplete,
  setAgentError,
  setAgentSkipped,
  setFactoryComplete,
} from "./lib/status.mjs";

import { run as scout }     from "./agents/scout.mjs";
import { run as amazon }    from "./agents/amazon.mjs";
import { run as scribe }    from "./agents/scribe.mjs";
import { run as factCheck } from "./agents/fact-checker.mjs";
import { run as image }     from "./agents/image.mjs";
import { run as publisher } from "./agents/publisher.mjs";
import { run as spark }     from "./agents/spark.mjs";
import { run as reel }      from "./agents/reel.mjs";
import { run as mailer }    from "./agents/mailer.mjs";

function readRoutineConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "config/routines.json"), "utf8"));
  } catch {
    return {};
  }
}

async function runMaintenance(reason = "manual") {
  try {
    const { buildOperationsStatus } = await import("./routine-maintenance.mjs");
    const status = buildOperationsStatus({ runOptimizerFirst: true, refreshSocialFirst: true, runTopicAuditFirst: true });
    info("Maintenance", `${reason}: ${status.qualityGates.status}`);
    return status;
  } catch (err) {
    warn("Maintenance", `Routine maintenance failed: ${err.message}`);
    return null;
  }
}

const PIPELINE = [
  { name: "Scout",     fn: scout,     desc: "Research & pick topic"         },
  { name: "Amazon",    fn: amazon,    desc: "Find affiliate product"         },
  { name: "Scribe",    fn: scribe,    desc: "Write full post"                },
  { name: "Fact Checker", fn: factCheck, desc: "Verify claims with cited web research" },
  { name: "Image",     fn: image,     desc: "Generate screened local cover"  },
  { name: "Publisher", fn: publisher, desc: "Append post to data/posts.js"   },
  { name: "Spark",     fn: spark,     desc: "Write social captions"          },
  { name: "Reel",      fn: reel,      desc: "Write short-form video script"  },
  { name: "Mailer",    fn: mailer,    desc: "Draft & send newsletter"        },
];

function countOutputFiles(subdir) {
  const dir = path.join(ROOT, "outputs", subdir);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => !f.startsWith(".") && f.endsWith(".txt")).length;
}

function countPosts() {
  const source = fs.readFileSync(path.join(ROOT, "data/posts.js"), "utf8");
  return [...source.matchAll(/slug:\s*["']([^"']+)["']/g)].length;
}

export async function runFactory() {
  const startTime = Date.now();
  startOpenAIRun(`factory-${new Date().toISOString()}`);

  divider("THE CLEAN CODE — CONTENT FACTORY");
  console.log(`  Started: ${new Date().toLocaleString()}`);
  console.log(`  Pipeline: ${PIPELINE.map((p) => p.name).join(" → ")}\n`);
  console.log(`  API guard: ${formatOpenAIUsageSummary()}\n`);

  clearContext();
  initFactoryRun();

  const notifier = await getNotifier();
  const results = { passed: [], failed: [], skipped: [] };

  for (const { name, fn, desc } of PIPELINE) {
    divider(`${name} — ${desc}`);
    setAgentRunning(name, desc);
    const agentStart = Date.now();
    try {
      await fn();
      results.passed.push(name);
      const ctx = readContext();
      const completedMsg =
        name === "Scout"     ? `Topic: "${ctx.topic ?? ""}"` :
        name === "Amazon"    ? `Product: ${ctx.product?.title ?? ""}` :
        name === "Scribe"    ? `Post: "${ctx.postData?.title ?? ""}"` :
        name === "Image"     ? `Saved: ${ctx.coverImagePath ?? ""}` :
        name === "Publisher" ? `Published: /${ctx.publishedSlug ?? ""}` :
        name === "Spark"     ? `Saved: ${ctx.socialFile ?? ""}` :
        name === "Reel"      ? `Saved: ${ctx.reelFile ?? ""}` :
        name === "Mailer"    ? `Saved: ${ctx.emailFile ?? ""}` : "Done";
      setAgentComplete(name, completedMsg);
      logAction({ agent: name, action: desc, method: 'pipeline', result: 'SUCCESS', output: completedMsg, durationMs: Date.now() - agentStart }).catch(() => {});
      // Reset failure counter on success
      if (notifier) notifier.resetAgentFailureCount(name);
    } catch (err) {
      error(name, `FAILED: ${err.message}`);
      setAgentError(name, err.message);
      logAction({ agent: name, action: desc, method: 'pipeline', result: 'FAILED', durationMs: Date.now() - agentStart, error: err }).catch(() => {});
      results.failed.push({ name, reason: err.message });

      // Track cross-run failure count — notify at 3
      if (notifier) notifier.checkAndNotifyAgentFailure(name, err.message).catch(() => {});

      const fatalAfter = ["Scout", "Scribe", "Fact Checker"];
      if (fatalAfter.includes(name)) {
        warn("Factory", `${name} is required — skipping remaining agents.`);
        const remaining = PIPELINE.slice(PIPELINE.findIndex((p) => p.name === name) + 1);
        remaining.forEach((p) => {
          setAgentSkipped(p.name);
          results.skipped.push(p.name);
        });
        break;
      }

      warn("Factory", `Continuing to next agent...`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const ctx = readContext();

  setFactoryComplete({
    lastPostTitle: ctx.postData?.title ?? null,
    lastPostSlug: ctx.publishedSlug ?? null,
    totalPostsPublished: countPosts(),
    totalSocialCaptions: countOutputFiles("social"),
  });

  divider("FACTORY COMPLETE");
  console.log(`  Duration : ${elapsed}s`);
  console.log(`  Passed   : ${results.passed.join(", ") || "none"}`);
  if (results.failed.length) {
    console.log(`  Failed   : ${results.failed.map((f) => `${f.name} (${f.reason})`).join(", ")}`);
  }
  if (results.skipped.length) {
    console.log(`  Skipped  : ${results.skipped.join(", ")}`);
  }
  console.log(`  OpenAI   : ${formatOpenAIUsageSummary(getOpenAIUsageSummary())}`);

  done(`Factory run finished in ${elapsed}s`);

  // Send Windows toast notification for factory completion
  if (notifier) notifier.sendFactoryComplete(results);

  return results;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const isScheduled = process.argv.includes("--schedule");
const isMaintenanceOnly = process.argv.includes("--maintenance");

if (isScheduled) {
  const routineConfig = readRoutineConfig();
  const CRON_EXPRESSION = routineConfig.factory?.cron || "0 6 * * 1,3,5";

  divider("THE CLEAN CODE — FACTORY SCHEDULER");
  console.log(`  Schedule : ${CRON_EXPRESSION}  (${routineConfig.factory?.label || "Mon / Wed / Fri at 6:00am"})`);
  console.log(`  Status   : Waiting for next trigger...`);
  console.log(`  Started  : ${new Date().toLocaleString()}\n`);

  if (!cron.validate(CRON_EXPRESSION)) {
    error("Scheduler", "Invalid cron expression. Exiting.");
    process.exit(1);
  }

  cron.schedule(CRON_EXPRESSION, async () => {
    console.log(`\n[Scheduler] Triggered at ${new Date().toLocaleString()}`);
    try {
      await runFactory();
      await runMaintenance("after-factory");
    } catch (err) {
      error("Scheduler", `Unhandled factory error: ${err.message}`);
    }
  });

  const MAINTENANCE_CRON = routineConfig.maintenance?.cron || "30 6 * * 1,3,5";
  if (routineConfig.maintenance?.enabled !== false && cron.validate(MAINTENANCE_CRON)) {
    cron.schedule(MAINTENANCE_CRON, () => runMaintenance("scheduled-maintenance"));
    console.log(`  Maintenance: ${routineConfig.maintenance?.label || MAINTENANCE_CRON}`);
  }

  // Sunday 08:00 — self-improvement cycle
  const SUNDAY_CRON = "0 8 * * 0";
  cron.schedule(SUNDAY_CRON, async () => {
    divider("ZIOMEK SELF-IMPROVEMENT — SUNDAY CYCLE");
    console.log(`  Started: ${new Date().toLocaleString()}`);
    try {
      const runImprover = await getImprover();
      if (!runImprover) {
        warn("Improver", "Improver disabled or unavailable (set ZIOMEK_IMPROVER=on to enable) — skipping.");
        return;
      }
      const result = await runImprover();
      done(`Self-improvement complete: ${result.deployed} deployed, ${result.pending} pending`);
    } catch (err) {
      error("Improver", `Self-improvement failed: ${err.message}`);
    }
  });
  console.log(`  Self-improvement: Sundays at 08:00\n`);

  process.on("SIGINT", () => {
    console.log("\n[Scheduler] Shutting down.");
    process.exit(0);
  });

} else if (isMaintenanceOnly) {
  await runMaintenance("maintenance-only");
} else {
  await runFactory();
}
