// Publisher — appends the completed post object from context into data/posts.js
// Usage: node --env-file=.env.local scripts/agents/publisher.mjs
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { pathToFileURL } from "url";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info, warn } from "../lib/log.mjs";

const AGENT = "Publisher";
const POSTS_FILE = path.join(ROOT, "data/posts.js");

function sanitizeGitError(message) {
  return String(message || "")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "[redacted-github-token]")
    .replace(/ghp_[A-Za-z0-9_]+/g, "[redacted-github-token]")
    .replace(/https:\/\/[^@\s"]+@github\.com/g, "https://[redacted-github-token]@github.com");
}

function serializePost(post) {
  const indent = "  ";
  const keywords = post.seo.keywords.map((k) => `"${k}"`).join(", ");
  const categories = post.categories.map((c) => `"${c}"`).join(", ");

  let productBlock = "";
  if (post.product) {
    productBlock =
      `${indent}product: {\n` +
      `${indent}  title: ${JSON.stringify(post.product.title)},\n` +
      `${indent}  image: ${JSON.stringify(post.product.image)},\n` +
      `${indent}  affiliateUrl: ${JSON.stringify(post.product.affiliateUrl)},\n` +
      `${indent}  description:\n${indent}    ${JSON.stringify(post.product.description)},\n` +
      `${indent}},\n`;
  }

  return (
    `\n\n  {\n` +
    `${indent}slug: ${JSON.stringify(post.slug)},\n` +
    `${indent}title: ${JSON.stringify(post.title)},\n` +
    `${indent}excerpt:\n${indent}  ${JSON.stringify(post.excerpt)},\n` +
    `${indent}date: ${JSON.stringify(post.date)},\n` +
    `${indent}author: { name: "The Clean Code Team" },\n` +
    `${indent}cover: ${JSON.stringify(post.cover)},\n` +
    `${indent}featured: ${post.featured},\n` +
    `${indent}categories: [${categories}],\n` +
    `${indent}seo: {\n` +
    `${indent}  keywords: [${keywords}],\n` +
    `${indent}  metaTitle: ${JSON.stringify(post.seo.metaTitle)},\n` +
    `${indent}  metaDescription:\n${indent}    ${JSON.stringify(post.seo.metaDescription)},\n` +
    `${indent}},\n` +
    productBlock +
    `${indent}content: \`\n${post.content}\n  \`,\n` +
    `},`
  );
}

// A syntax error in posts.js fails every Vercel build silently (Jul–Sep 2026: 20 posts never went live),
// so load the new source as a module before writing it and refuse to publish if it doesn't parse.
async function assertPostsSourceValid(source) {
  const tmp = path.join(ROOT, "outputs", `.posts-check-${process.pid}.mjs`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, source, "utf8");
  try {
    const { posts } = await import(pathToFileURL(tmp).href);
    if (!Array.isArray(posts)) throw new Error("posts export is not an array");
    const slugs = posts.map((p) => p.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    if (dupes.length) throw new Error(`duplicate slugs: ${[...new Set(dupes)].join(", ")}`);
  } catch (err) {
    throw new Error(`data/posts.js would be invalid, not publishing: ${err.message}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function gitPush(agent, post) {
  const gitEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: 'echo',
    GCM_INTERACTIVE: 'never',
    GIT_CREDENTIAL_INTERACTIVE: 'never',
  };
  const exec = (cmd) => execSync(cmd, { cwd: ROOT, stdio: "pipe", env: gitEnv, timeout: 45_000 }).toString().trim();
  const git = 'git -c credential.helper= -c core.askPass=echo -c credential.interactive=false';

  const candidates = [
    path.join("data", "posts.js"),
    path.join("public", "images", `${post.slug}.jpg`),
    path.join("public", "images", `${post.slug}.png`),
    path.join("public", "images", `${post.slug}.webp`),
    path.join("public", "images", `${post.slug}.svg`),
  ];
  const toStage = candidates.filter((f) => fs.existsSync(path.join(ROOT, f)));

  step(agent, `Git: staging ${toStage.length} file(s)...`);
  exec(`${git} add ${toStage.map((f) => `"${f}"`).join(" ")}`);

  try {
    exec(`${git} commit -m "factory: add post '${post.slug}'"`);
  } catch (e) {
    warn(agent, "Nothing to commit - skipping push.");
    return;
  }

  const token = (process.env.GITHUB_TOKEN || '').trim();
  if (!token) {
    warn(agent, "GITHUB_TOKEN missing - local post saved, GitHub push skipped.");
    return;
  }

  step(agent, "Git: pushing to origin main without credential popups...");
  const originUrl = exec(`${git} remote get-url origin`).replace(/^https:\/\/[^@]+@github\.com/i, 'https://github.com');
  if (!/^https:\/\/github\.com\//i.test(originUrl)) {
    throw new Error("Git remote must be an HTTPS GitHub URL for non-interactive token push.");
  }
  const authed = originUrl.replace(/^https:\/\//i, `https://${encodeURIComponent(token)}@`);
  exec(`${git} push "${authed}" main`);
  // Pushing to a URL (not the remote name) leaves origin/main stale, so git status reports "ahead N" forever.
  exec(`${git} update-ref refs/remotes/origin/main HEAD`);
  info(agent, "Pushed to origin main.");
}

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const post = ctx.postData;
  step(AGENT, `Publishing: "${post.title}" → data/posts.js`);

  let source = fs.readFileSync(POSTS_FILE, "utf8");
  const lastBracket = source.lastIndexOf("];");
  if (lastBracket === -1) throw new Error('Could not find closing "]; " in data/posts.js');

  const serialized = serializePost(post);
  const updated = source.slice(0, lastBracket) + serialized + "\n" + source.slice(lastBracket);
  await assertPostsSourceValid(updated);
  fs.writeFileSync(POSTS_FILE, updated, "utf8");

  info(AGENT, `Post appended — slug: ${post.slug}`);
  let publishWarning = null;
  try {
    gitPush(AGENT, post);
  } catch (err) {
    publishWarning = "Local post saved, but GitHub push failed. Review GitHub token permissions before deploy.";
    warn(AGENT, publishWarning);
    warn(AGENT, sanitizeGitError(err.message));
  }

  const ctx2 = writeContext({ published: true, publishedSlug: post.slug, publishWarning });
  return ctx2;
}

// Standalone entry point
if (process.argv[1].includes("publisher.mjs")) {
  await run();
}
