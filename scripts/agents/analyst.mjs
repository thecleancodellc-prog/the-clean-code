// Analyst — generates a weekly performance summary report
// Usage: node --env-file=.env.local scripts/agents/analyst.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, ROOT } from "../lib/context.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Analyst";

function countOutputFiles(subdir) {
  const dir = path.join(ROOT, "outputs", subdir);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => !f.startsWith(".")).length;
}

function parsePostsFile() {
  const source = fs.readFileSync(path.join(ROOT, "data/posts.js"), "utf8");
  const slugs = [...source.matchAll(/slug:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const titles = [...source.matchAll(/title:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const categories = [...source.matchAll(/categories:\s*\[([^\]]+)\]/g)].map((m) =>
    m[1].match(/["']([^"']+)["']/g)?.map((s) => s.replace(/["']/g, "")) ?? []
  );
  const featured = [...source.matchAll(/featured:\s*(true|false)/g)].map(
    (m) => m[1] === "true"
  );

  // Count category occurrences
  const catCount = {};
  categories.flat().forEach((c) => {
    catCount[c] = (catCount[c] || 0) + 1;
  });

  return {
    total: slugs.length,
    slugs,
    titles,
    featuredCount: featured.filter(Boolean).length,
    categoryBreakdown: catCount,
  };
}

export async function run() {
  step(AGENT, "Compiling weekly performance summary...");

  const ctx = readContext();
  const posts = parsePostsFile();

  // Count outputs generated
  const socialCount = countOutputFiles("social");
  const reelCount = countOutputFiles("reels");
  const emailCount = countOutputFiles("emails");
  const imageCount = countOutputFiles("images");

  // List recent output files
  const recentFiles = ["social", "reels", "emails", "images"]
    .flatMap((dir) => {
      const fullDir = path.join(ROOT, "outputs", dir);
      if (!fs.existsSync(fullDir)) return [];
      return fs.readdirSync(fullDir)
        .filter((f) => !f.startsWith("."))
        .map((f) => {
          const stat = fs.statSync(path.join(fullDir, f));
          return { file: `outputs/${dir}/${f}`, mtime: stat.mtimeMs };
        });
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10);

  // Use OpenAI to write a human-readable summary
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const statsBlock = `
Blog stats:
- Total posts published: ${posts.total}
- Featured posts: ${posts.featuredCount}
- Category breakdown: ${Object.entries(posts.categoryBreakdown).map(([k, v]) => `${k} (${v})`).join(", ")}
- Most recent post: ${posts.titles[posts.titles.length - 1] ?? "none"}

Content outputs generated (all time):
- Social media captions: ${socialCount} sets
- Reel/video scripts: ${reelCount}
- Newsletter emails: ${emailCount}
- Cover images: ${imageCount}

Last factory run: ${ctx.runDate ? new Date(ctx.runDate).toLocaleString() : "unknown"}
Last published slug: ${ctx.publishedSlug ?? "unknown"}
`;

  info(AGENT, "Stats compiled. Writing narrative summary...");

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You're a content marketing analyst for "The Clean Code" blog. Write a concise weekly performance summary based on these stats. Highlight what's working, note any gaps, and suggest 2–3 action items for next week. Keep it under 300 words, plain text, no markdown headers.

${statsBlock}`,
      },
    ],
  });

  const narrative = response.choices[0].message.content;

  const report = [
    "THE CLEAN CODE — WEEKLY PERFORMANCE REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    "═══════════════════════════════════════════════════",
    "",
    "RAW STATS",
    "─────────",
    statsBlock.trim(),
    "",
    "RECENT OUTPUT FILES",
    "─────────────────",
    recentFiles.map((f) => `  ${f.file}`).join("\n") || "  none",
    "",
    "SUMMARY & RECOMMENDATIONS",
    "─────────────────────────",
    narrative,
    "",
  ].join("\n");

  const outFile = path.join(ROOT, "outputs/weekly-report.txt");
  fs.writeFileSync(outFile, report, "utf8");

  info(AGENT, `Report saved to outputs/weekly-report.txt`);
  info(AGENT, `Total posts: ${posts.total} | Social files: ${socialCount} | Reels: ${reelCount} | Emails: ${emailCount}`);

  return report;
}

// Standalone entry point
if (process.argv[1].includes("analyst.mjs")) {
  await run();
}
