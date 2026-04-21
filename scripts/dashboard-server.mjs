#!/usr/bin/env node
// Dashboard server — serves control panel + RPG dashboard, exposes /api/status and /api/posts
// Usage: node --env-file=.env.local scripts/dashboard-server.mjs
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 4000;

const app = express();

// ─── Static dashboard files ───────────────────────────────────────────────────
app.use(express.static(path.join(ROOT, "dashboard")));

// ─── /api/status ─────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const statusFile = path.join(ROOT, "outputs/factory-status.json");
  try {
    const data = JSON.parse(fs.readFileSync(statusFile, "utf8"));
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

// ─── /api/posts ──────────────────────────────────────────────────────────────
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

// ─── Root redirect ────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.redirect("/control-panel.html"));

app.listen(PORT, () => {
  console.log(`\n  Dashboard running at http://localhost:${PORT}`);
  console.log(`  Control Panel → http://localhost:${PORT}/control-panel.html`);
  console.log(`  RPG World     → http://localhost:${PORT}/rpg-world.html\n`);
});
