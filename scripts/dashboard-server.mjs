#!/usr/bin/env node
// Dashboard server — serves control panel + RPG dashboard, exposes /api/status and /api/posts
// Usage: node --env-file=.env.local scripts/dashboard-server.mjs
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.DASHBOARD_PORT || 4000);

const app = express();
app.use(express.json());

function readJsonFile(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeFactoryStatus(status, statusFile) {
  if (!status?.isRunning) return status;
  const last = Date.parse(status.lastUpdate || status.lastRunDate || "");
  const stale = !Number.isFinite(last) || Date.now() - last > 30 * 60 * 1000;
  if (!stale) return status;

  status.isRunning = false;
  status.currentAgent = null;
  status.staleRecovered = true;
  status.activityFeed = [
    { message: "Factory run marked stale and unlocked", time: new Date().toISOString() },
    ...(status.activityFeed || [])
  ].slice(0, 30);

  try {
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), "utf8");
  } catch { /* dashboard can still return normalized status */ }

  return status;
}

// ─── CORS (allow ziomek-city dashboard on any local origin) ────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Static dashboard files ────────────────────────────────────────────────────
app.use(express.static(path.join(ROOT, "dashboard")));
// Only social assets are needed by social-command-center.html. Do NOT expose all of outputs/:
// the dashboard is tunneled publicly via ngrok and outputs/logs/ has held credential-bearing errors.
app.use("/outputs/social-command-center", express.static(path.join(ROOT, "outputs/social-command-center")));

// ─── /api/status ───────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const statusFile = path.join(ROOT, "outputs/factory-status.json");
  try {
    const data = normalizeFactoryStatus(JSON.parse(fs.readFileSync(statusFile, "utf8")), statusFile);
    res.json(data);
  } catch {
    res.json({
      isRunning: false,
      currentAgent: null,
      lastUpdate: null,
      agents: {},
      stats: { totalPostsPublished: 0, totalSocialCaptions: 0, lastPostTitle: null, lastPostSlug: null },
      activityFeed: [],
    });
  }
});

// ─── /api/posts ────────────────────────────────────────────────────────────────
app.get("/api/posts", (req, res) => {
  try {
    const source = fs.readFileSync(path.join(ROOT, "data/posts.js"), "utf8");

    const slugs     = [...source.matchAll(/slug:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    const titles    = [...source.matchAll(/title:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    const dates     = [...source.matchAll(/date:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    const featured  = [...source.matchAll(/featured:\s*(true|false)/g)].map((m) => m[1] === "true");
    const catBlocks = [...source.matchAll(/categories:\s*\[([^\]]+)\]/g)].map((m) =>
      (m[1].match(/["']([^"']+)["']/g) ?? []).map((s) => s.replace(/["']/g, ""))
    );

    const posts = slugs.map((slug, i) => ({
      slug,
      title: titles[i] ?? "",
      date: dates[i] ?? "",
      featured: featured[i] ?? false,
      categories: catBlocks[i] ?? [],
    }));

    // Count outputs
    const countFiles = (subdir, ext) => {
      const dir = path.join(ROOT, "outputs", subdir);
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).length;
    };

    res.json({
      count: posts.length,
      posts,
      outputs: {
        social: countFiles("social", ".txt"),
        reels:  countFiles("reels",  ".txt"),
        emails: countFiles("emails", ".txt"),
        images: countFiles("images", ".jpg"),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── /api/social/:slug ─────────────────────────────────────────────────────────

app.get("/api/social-readiness", (req, res) => {
  const config = readJsonFile(path.join(ROOT, "config/social-command-center.json"), {});
  const social = readJsonFile(path.join(ROOT, "outputs/social-command-center/status.json"), {});
  const operations = readJsonFile(path.join(ROOT, "outputs/operations-status.json"), {});
  const configured = name => Boolean(String(process.env[name] || "").trim());
  const platforms = config.platforms || {};
  const connectors = {
    pinterest: {
      account: platforms.pinterest?.status || "unknown",
      enabled: platforms.pinterest?.enabled === true,
      apiConfigured: configured("PINTEREST_TOKEN"),
      mode: configured("PINTEREST_TOKEN") ? "api-ready" : "manual"
    },
    instagram: {
      account: platforms.instagram?.status || "unknown",
      enabled: platforms.instagram?.enabled === true,
      apiConfigured: configured("INSTAGRAM_ACCESS_TOKEN"),
      mode: configured("INSTAGRAM_ACCESS_TOKEN") ? "api-ready" : "manual"
    },
    tiktok: {
      account: platforms.tiktok?.status || "unknown",
      enabled: platforms.tiktok?.enabled === true,
      apiConfigured: configured("TIKTOK_ACCESS_TOKEN"),
      mode: configured("TIKTOK_ACCESS_TOKEN") ? "api-ready" : "not-connected"
    },
    facebook: {
      account: platforms.facebook?.status || "unknown",
      enabled: platforms.facebook?.enabled === true,
      apiConfigured: configured("FACEBOOK_PAGE_ACCESS_TOKEN"),
      mode: configured("FACEBOOK_PAGE_ACCESS_TOKEN") ? "api-ready" : "not-connected"
    }
  };

  const blockers = [];
  if ((social.counts?.ready || 0) < 1) blockers.push({ level: "critical", message: "No social post currently passes the content gates." });
  if ((social.counts?.visualAssetsReady || 0) < 1) blockers.push({ level: "critical", message: "No finished social image is ready." });
  if ((operations.contentQuality?.placeholderProducts || 0) > 0) blockers.push({ level: "critical", message: `${operations.contentQuality.placeholderProducts} placeholder Amazon products must be replaced.` });
  if ((operations.contentQuality?.thinPosts || 0) > 0) blockers.push({ level: "warning", message: `${operations.contentQuality.thinPosts} thin posts should not be mass-promoted yet.` });
  if (!connectors.pinterest.apiConfigured) blockers.push({ level: "setup", message: "Pinterest is manual until its API token is connected." });
  if (!connectors.instagram.apiConfigured) blockers.push({ level: "setup", message: "Instagram is manual until a professional Meta connection is configured." });
  if (connectors.tiktok.account !== "account-created") blockers.push({ level: "setup", message: "TikTok account still needs to be created and branded." });
  if (connectors.facebook.account !== "account-created") blockers.push({ level: "setup", message: "Facebook Page still needs to be created and linked to Instagram." });

  const manualReady = (social.counts?.ready || 0) > 0 && (social.counts?.visualAssetsReady || 0) > 0;
  const apiReady = Object.values(connectors).filter(item => item.enabled).every(item => item.apiConfigured);
  res.json({
    generatedAt: new Date().toISOString(),
    phase: apiReady ? "api_launch_ready" : manualReady ? "manual_launch_ready" : "build_assets",
    manualReady,
    apiReady,
    connectors,
    content: {
      totalPosts: operations.contentQuality?.actualPosts ?? social.counts?.total ?? 0,
      socialReady: social.counts?.ready ?? 0,
      revenueReady: social.counts?.revenueReady ?? 0,
      visualReady: social.counts?.visualAssetsReady ?? 0,
      thinPosts: operations.contentQuality?.thinPosts ?? null,
      visualProblems: operations.contentQuality?.visualProblems ?? null,
      placeholderProducts: operations.contentQuality?.placeholderProducts ?? null,
      quality: operations.qualityGates?.status || "unknown"
    },
    blockers,
    nextAction: manualReady
      ? "Review and manually publish the top revenue-ready Pinterest and Instagram package while API connections are prepared."
      : "Finish one revenue-ready post and matching visual package before opening additional channels."
  });
});
app.get("/api/social-command", (req, res) => {
  const status = readJsonFile(path.join(ROOT, "outputs/social-command-center/status.json"), null);
  const queue = readJsonFile(path.join(ROOT, "outputs/social-command-center/queue.json"), []);
  res.json(status ? { ...status, queue } : {
    generatedAt: null,
    socialStatus: "not_generated",
    counts: { total: 0, ready: 0, needsReview: 0, blocked: 0, revenueReady: 0 },
    queue: [],
    recommendedNextActions: ["Run npm run social to generate the first queue."]
  });
});

app.get("/api/social-visual-briefs", (req, res) => {
  const briefs = readJsonFile(path.join(ROOT, "outputs/social-command-center/visual-briefs.json"), []);
  res.json({ count: briefs.length, briefs });
});

app.get("/api/social-command/:slug", (req, res) => {
  const queue = readJsonFile(path.join(ROOT, "outputs/social-command-center/queue.json"), []);
  const item = queue.find(entry => entry.slug === req.params.slug);
  if (!item) return res.status(404).json({ error: "Social draft not found" });
  res.json(item);
});
app.get("/api/social/:slug", (req, res) => {
  const file = path.join(ROOT, "outputs/social", `${req.params.slug}-social.txt`);
  if (!fs.existsSync(file)) return res.status(404).send("Not found");
  res.type("text/plain").send(fs.readFileSync(file, "utf8"));
});

// ─── /api/run-factory ──────────────────────────────────────────────────────────
// Local-only: port 4000 is tunneled publicly via ngrok, and a run spends API credits and pushes to the live site.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isLocalRequest(req) {
  if (req.headers["x-forwarded-for"] || req.headers["x-forwarded-host"]) return false; // came through ngrok
  if (!LOOPBACK.has(req.socket.remoteAddress || "")) return false;
  const origin = req.headers.origin;
  return !origin || LOCAL_ORIGIN.test(origin); // blocks other websites POSTing to localhost:4000
}

app.post("/api/run-factory", async (req, res) => {
  if (!isLocalRequest(req)) return res.status(403).json({ error: "Factory can only be started from this PC" });

  const statusFile = path.join(ROOT, "outputs/factory-status.json");
  try {
    const status = normalizeFactoryStatus(JSON.parse(fs.readFileSync(statusFile, "utf8")), statusFile);
    if (status.isRunning) return res.status(409).json({ error: "Factory already running" });
  } catch { /* file may not exist yet */ }

  const { spawn } = await import("child_process");
  const child = spawn(
    process.execPath,
    ["--env-file=.env.local", "scripts/factory.mjs"],
    { cwd: ROOT, detached: true, stdio: "ignore" }
  );
  child.unref();
  res.json({ started: true });
});

// ─── Root redirect ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.redirect("/control-panel.html"));

app.listen(PORT, () => {
  console.log(`\n  Dashboard running at http://localhost:${PORT}`);
  console.log(`  Control Panel -> http://localhost:${PORT}/control-panel.html`);
  console.log(`  RPG World     -> http://localhost:${PORT}/rpg-world.html`);
  console.log(`  Social Center -> http://localhost:${PORT}/social-command-center.html\n`);
});
