#!/usr/bin/env node
// Factory — master content pipeline
// Run once:      node --env-file=.env.local scripts/factory.mjs
// Run scheduler: node --env-file=.env.local scripts/factory.mjs --schedule
//
// Pipeline order: Scout → Amazon → Scribe → Image → Publisher → Spark → Reel → Mailer

import cron from "node-cron";
import fs from "fs";
import path from "path";
import { clearContext, readContext, ROOT } from "./lib/context.mjs";
import { divider, step, info, error, done, warn } from "./lib/log.mjs";
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
import { run as image }     from "./agents/image.mjs";
import { run as publisher } from "./agents/publisher.mjs";
import { run as spark }     from "./agents/spark.mjs";
import { run as reel }      from "./agents/reel.mjs";
import { run as mailer }    from "./agents/mailer.mjs";

const PIPELINE = [
  { name: "Scout",     fn: scout,     desc: "Research & pick topic"         },
  { name: "Amazon",    fn: amazon,    desc: "Find affiliate product"         },
  { name: "Scribe",    fn: scribe,    desc: "Write full post"                },
  { name: "Image",     fn: image,     desc: "Generate cover image (DALL-E)"  },
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

  divider("THE CLEAN CODE — CONTENT FACTORY");
  console.log(`  Started: ${new Date().toLocaleString()}`);
  console.log(`  Pipeline: ${PIPELINE.map((p) => p.name).join(" → ")}\n`);

  clearContext();
  initFactoryRun();

  const results = { passed: [], failed: [], skipped: [] };

  for (const { name, fn, desc } of PIPELINE) {
    divider(`${name} — ${desc}`);
    setAgentRunning(name, desc);
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
    } catch (err) {
      error(name, `FAILED: ${err.message}`);
      setAgentError(name, err.message);
      results.failed.push({ name, reason: err.message });

      const fatalAfter = ["Scout", "Scribe"];
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

  done(`Factory run finished in ${elapsed}s`);
  return results;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const isScheduled = process.argv.includes("--schedule");

if (isScheduled) {
  const CRON_EXPRESSION = "0 6 * * 1,3,5";

  divider("THE CLEAN CODE — FACTORY SCHEDULER");
  console.log(`  Schedule : ${CRON_EXPRESSION}  (Mon / Wed / Fri at 6:00am)`);
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
    } catch (err) {
      error("Scheduler", `Unhandled factory error: ${err.message}`);
    }
  });

  process.on("SIGINT", () => {
    console.log("\n[Scheduler] Shutting down.");
    process.exit(0);
  });

} else {
  await runFactory();
}
