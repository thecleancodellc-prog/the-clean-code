#!/usr/bin/env node
// Routine maintenance runner for The Clean Code.
// Runs the optimizer, summarizes quality gates, and writes outputs/operations-status.json for Ziomek City.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ROUTINES_FILE = path.join(ROOT, "config", "routines.json");
const OPS_FILE = path.join(ROOT, "outputs", "operations-status.json");
const STATUS_FILE = path.join(ROOT, "outputs", "factory-status.json");
const AUDIT_DIR = path.join(ROOT, "outputs", "content-audits");

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function latestSocialStatus() {
  return readJson(path.join(ROOT, "outputs/social-command-center/status.json"), null);
}

function latestFile(prefix, ext = ".json") {
  if (!fs.existsSync(AUDIT_DIR)) return null;
  return fs.readdirSync(AUDIT_DIR)
    .filter(name => name.startsWith(prefix) && name.endsWith(ext))
    .map(name => ({ name, full: path.join(AUDIT_DIR, name), mtime: fs.statSync(path.join(AUDIT_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.full || null;
}

function countPlaceholderProducts(audit) {
  return (audit.affiliateProblems || []).reduce((sum, item) => sum + (item.exampleLinks?.length || 0), 0);
}

function countShortLinks(audit) {
  return (audit.affiliateProblems || []).reduce((sum, item) => sum + (item.shortLinks?.length || 0), 0);
}

function countPosts() {
  try {
    const source = fs.readFileSync(path.join(ROOT, "data/posts.js"), "utf8");
    return [...source.matchAll(/slug:\s*["']([^"']+)["']/g)].length;
  } catch {
    return null;
  }
}

function buildAgentHealth(factoryStatus) {
  const agents = factoryStatus.agents || {};
  return Object.entries(agents).map(([name, agent]) => {
    const msg = String(agent.lastMessage || "");
    const issues = [];
    const suspiciousMediaText = name === "Amazon" && /\.jpg|\.png/i.test(msg);
    if (/[<>]/.test(msg) || /\/gp\/prime|fallback_CTA/i.test(msg) || suspiciousMediaText) {
      issues.push("last message contains suspicious scraped HTML/media text");
    }
    if (agent.status === "error") issues.push("last run failed");
    return {
      name,
      status: agent.status || "unknown",
      updatedAt: agent.updatedAt || null,
      ok: issues.length === 0 && agent.status !== "error",
      issues,
      lastMessage: msg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    };
  });
}

function buildGateStatus(routines, audit) {
  const gates = routines.qualityGates || {};
  const duplicateCount = (audit.duplicatePairs || []).filter(pair => pair.severity === "high").length;
  const visualCount = (audit.visualProblems || []).length;
  const placeholderCount = countPlaceholderProducts(audit);
  const affiliateChecks = (audit.affiliateProblems || []).length;
  const thinCount = (audit.thinPosts || []).length;

  const checks = [
    { id: "duplicate_slugs", label: "Duplicate slugs", value: duplicateCount, max: gates.maxDuplicateSlugs ?? 0, ok: duplicateCount <= (gates.maxDuplicateSlugs ?? 0) },
    { id: "visual_issues", label: "Missing/fallback covers", value: visualCount, max: gates.maxVisualIssues ?? 0, ok: visualCount <= (gates.maxVisualIssues ?? 0) },
    { id: "placeholder_products", label: "Placeholder Amazon products", value: placeholderCount, max: gates.maxPlaceholderProducts ?? 0, ok: placeholderCount <= (gates.maxPlaceholderProducts ?? 0) },
    { id: "affiliate_checks", label: "Affiliate checks", value: affiliateChecks, max: gates.maxAffiliateChecks ?? 2, ok: affiliateChecks <= (gates.maxAffiliateChecks ?? 2) },
  ];

  const hardPass = checks.every(check => check.ok);
  return {
    status: hardPass ? "healthy" : "needs_attention",
    checks,
    editorialBacklog: {
      thinPosts: thinCount,
      repeatedPhrasePosts: (audit.repetition || []).length,
      oldPostReview: (audit.stalePosts || []).length
    },
    remainingTopActions: (audit.repairQueue || []).slice(0, 12)
  };
}

function runOptimizer() {
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "scripts/content-optimizer.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 90_000
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || ""
  };
}

function refreshSocialQueue() {
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "scripts/social-command-center.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180_000,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
  };
}

function runTopicAudit() {
  const result = spawnSync(process.execPath, ["scripts/topic-audit.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
  };
}

export function buildOperationsStatus({ runOptimizerFirst = false, refreshSocialFirst = false, runTopicAuditFirst = false } = {}) {
  const routines = readJson(ROUTINES_FILE, {});
  const optimizerRun = runOptimizerFirst ? runOptimizer() : { ok: null, skipped: true };
  const socialRefresh = refreshSocialFirst ? refreshSocialQueue() : { ok: null, skipped: true };
  const topicAuditRun = runTopicAuditFirst ? runTopicAudit() : { ok: null, skipped: true };
  const auditPath = latestFile("content-audit-");
  const repairPath = latestFile("repair-plan-");
  const topicAuditPath = latestFile("topic-audit-");
  const audit = auditPath ? readJson(auditPath, {}) : {};
  const topicAudit = topicAuditPath ? readJson(topicAuditPath, {}) : {};
  const factoryStatus = readJson(STATUS_FILE, {});
  const gateStatus = buildGateStatus(routines, audit);

  const status = {
    generatedAt: new Date().toISOString(),
    businessId: routines.businessId || "the-clean-code",
    businessName: routines.businessName || "The Clean Code",
    timezone: routines.timezone || "America/New_York",
    routines,
    scheduler: {
      factory: routines.factory || null,
      maintenance: routines.maintenance || null,
      weeklyReview: routines.weeklyReview || null
    },
    factory: {
      isRunning: Boolean(factoryStatus.isRunning),
      currentAgent: factoryStatus.currentAgent || null,
      lastRunDate: factoryStatus.lastRunDate || null,
      lastUpdate: factoryStatus.lastUpdate || null,
      agents: factoryStatus.agents || {},
      stats: factoryStatus.stats || {}
    },
    agentHealth: buildAgentHealth(factoryStatus),
    contentQuality: {
      auditPath,
      repairPath,
      topicAuditPath,
      actualPosts: countPosts(),
      topicClustersToReview: topicAudit.summary?.clusters || 0,
      duplicatePairs: (audit.duplicatePairs || []).length,
      highDuplicatePairs: (audit.duplicatePairs || []).filter(pair => pair.severity === "high").length,
      thinPosts: (audit.thinPosts || []).length,
      repetitionWarnings: (audit.repetition || []).length,
      affiliateProblems: (audit.affiliateProblems || []).length,
      placeholderProducts: countPlaceholderProducts(audit),
      shortLinksToVerify: countShortLinks(audit),
      visualProblems: (audit.visualProblems || []).length,
      repairQueueItems: (audit.repairQueue || []).length
    },
    qualityGates: gateStatus,
    socialCommand: latestSocialStatus(),
    socialRefresh,
    topicAuditRun,
    optimizerRun,
    ziomekSummary: gateStatus.status === "healthy"
      ? "The Clean Code routine systems are healthy. Continue scheduled publishing and weekly review."
      : "The Clean Code needs attention before scaling. Fix the top repair queue items, especially monetization and content quality gates."
  };

  fs.mkdirSync(path.dirname(OPS_FILE), { recursive: true });
  fs.writeFileSync(OPS_FILE, JSON.stringify(status, null, 2), "utf8");
  return status;
}

if (process.argv[1] && process.argv[1].endsWith("routine-maintenance.mjs")) {
  const status = buildOperationsStatus({ runOptimizerFirst: true, refreshSocialFirst: true, runTopicAuditFirst: true });
  console.log(`Operations status written: ${OPS_FILE}`);
  console.log(`Quality status: ${status.qualityGates.status}`);
  console.log(`Top actions: ${status.qualityGates.remainingTopActions.length}`);
}
