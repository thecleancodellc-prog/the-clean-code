#!/usr/bin/env node
/**
 * Design Audit — analyzes thecleancode.co HTML/CSS and suggests improvements via Ollama
 * Usage: node --env-file=.env.local scripts/design-audit.mjs [--live] [--save]
 *
 * --live  : fetch the live site via Playwright instead of reading local files
 * --save  : write report to brain/Reports/design-audit-[date].md
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const BRAIN_DIR  = process.env.BRAIN_DIR ?? path.resolve(ROOT, '../ziomek-city/brain');
const OLLAMA     = 'http://localhost:11434';

const args   = process.argv.slice(2);
const useLive = args.includes('--live');
const doSave  = args.includes('--save');

// ── Gather HTML + CSS ─────────────────────────────────────────────────────────

async function gatherFromLocal() {
  const snippets = [];

  // Read key pages
  const htmlFiles = [
    path.join(ROOT, 'app', 'page.tsx'),
    path.join(ROOT, 'app', 'layout.tsx'),
    path.join(ROOT, 'app', 'globals.css'),
    path.join(ROOT, 'styles', 'globals.css'),
    path.join(ROOT, 'components', 'Header.tsx'),
    path.join(ROOT, 'components', 'Footer.tsx'),
    path.join(ROOT, 'components', 'Hero.tsx'),
  ];

  for (const f of htmlFiles) {
    if (existsSync(f)) {
      const content = await readFile(f, 'utf-8');
      snippets.push({ file: path.relative(ROOT, f), content: content.slice(0, 3000) });
    }
  }

  // Fallback: scan for any tsx/css files
  if (!snippets.length) {
    const { readdir } = await import('fs/promises');
    const dirs = ['app', 'components', 'styles', 'pages'].map(d => path.join(ROOT, d));
    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      const files = await readdir(dir).catch(() => []);
      for (const f of files.slice(0, 5)) {
        if (f.match(/\.(tsx|jsx|css|scss)$/)) {
          const content = await readFile(path.join(dir, f), 'utf-8').catch(() => '');
          if (content) snippets.push({ file: `${path.basename(dir)}/${f}`, content: content.slice(0, 2000) });
        }
      }
    }
  }

  return snippets;
}

async function gatherFromLive(url = 'https://thecleancode.co') {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
    const data = await page.evaluate(() => {
      const styles = [...document.styleSheets]
        .flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch { return []; } })
        .join('\n').slice(0, 5000);
      const html   = document.documentElement.outerHTML.slice(0, 8000);
      const title  = document.title;
      const meta   = [...document.querySelectorAll('meta')].map(m => m.outerHTML).join('\n');
      return { html, styles, title, meta };
    });
    return [
      { file: 'live/page.html',  content: data.html },
      { file: 'live/styles.css', content: data.styles },
      { file: 'live/meta.html',  content: data.meta },
    ];
  } finally {
    await browser.close().catch(() => {});
  }
}

// ── Audit categories ──────────────────────────────────────────────────────────

const AUDIT_CATEGORIES = [
  {
    name: 'Typography & Readability',
    prompt: 'Analyze typography, font sizes, line heights, contrast ratios, and readability. Be specific about any issues and suggest exact CSS fixes.',
  },
  {
    name: 'Color & Visual Hierarchy',
    prompt: 'Analyze color choices, visual hierarchy, use of whitespace, and whether the design guides the user\'s eye effectively. Suggest specific color improvements.',
  },
  {
    name: 'Mobile Responsiveness',
    prompt: 'Identify any responsive design issues, breakpoint problems, or elements that might break on small screens. Suggest fixes.',
  },
  {
    name: 'Conversion & CTA',
    prompt: 'Evaluate call-to-action buttons, forms, affiliate links, and conversion elements. Are they prominent enough? Suggest specific improvements to increase clicks.',
  },
  {
    name: 'Performance & SEO',
    prompt: 'Identify HTML/CSS patterns that hurt performance or SEO. Check meta tags, heading hierarchy, image alt text, and loading strategies.',
  },
];

async function auditCategory(snippets, category) {
  const codeContext = snippets
    .map(s => `\`\`\`\n// ${s.file}\n${s.content}\n\`\`\``)
    .join('\n\n')
    .slice(0, 6000);

  const prompt = `You are a senior web designer and UX expert auditing thecleancode.co — an eco-friendly, clean-living blog.

CATEGORY: ${category.name}
TASK: ${category.prompt}

Here is the site's code:
${codeContext}

Provide 3-5 specific, actionable improvements. For each:
- What the issue is
- Exact code or CSS change to fix it
- Expected impact

Be concrete. No vague suggestions like "improve spacing" — give exact pixel values, color codes, or code snippets.`;

  const res = await fetch(`${OLLAMA}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:   'qwen2.5',
      prompt,
      stream:  false,
      options: { num_predict: 600 },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return (data.response ?? '').trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n[design-audit] Starting audit of thecleancode.co…');
console.log(`[design-audit] Mode: ${useLive ? 'live site' : 'local files'}\n`);

let snippets;
if (useLive) {
  console.log('[design-audit] Fetching live site via Playwright…');
  snippets = await gatherFromLive();
} else {
  console.log('[design-audit] Reading local source files…');
  snippets = await gatherFromLocal();
}

if (!snippets.length) {
  console.error('[design-audit] No source files found. Run from TheCleanCode root or use --live.');
  process.exit(1);
}

console.log(`[design-audit] Loaded ${snippets.length} file(s). Running ${AUDIT_CATEGORIES.length} audit categories...\n`);

const date    = new Date().toISOString().slice(0, 10);
const results = [];

for (const cat of AUDIT_CATEGORIES) {
  process.stdout.write(`  Auditing: ${cat.name}… `);
  try {
    const feedback = await auditCategory(snippets, cat);
    results.push({ category: cat.name, feedback });
    console.log('done');
  } catch (err) {
    results.push({ category: cat.name, feedback: `Error: ${err.message}` });
    console.log('failed');
  }
  await new Promise(r => setTimeout(r, 500));
}

// Build report
const report = [
  `# Design Audit Report — thecleancode.co`,
  `**Date:** ${date}`,
  `**Mode:** ${useLive ? 'Live site' : 'Local files'}`,
  ``,
  ...results.flatMap(r => [
    `## ${r.category}`,
    ``,
    r.feedback,
    ``,
  ]),
  `---`,
  `*Generated by Ziomek design-audit.mjs using Ollama qwen2.5*`,
].join('\n');

console.log('\n═══ DESIGN AUDIT REPORT ═══════════════════════════════');
console.log(report.slice(0, 3000));
if (report.length > 3000) console.log('\n… (truncated, see saved file)');
console.log('══════════════════════════════════════════════════════\n');

if (doSave) {
  const reportsDir = path.join(BRAIN_DIR, 'Reports');
  await mkdir(reportsDir, { recursive: true }).catch(() => {});
  const outPath = path.join(reportsDir, `design-audit-${date}.md`);
  await writeFile(outPath, report, 'utf-8');
  console.log(`[design-audit] Report saved to: ${outPath}`);
}

// JSON output for programmatic consumption
process.stdout.write('\n__AUDIT_RESULT__\n' + JSON.stringify({ date, results }) + '\n');
