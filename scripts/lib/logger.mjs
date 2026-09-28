/**
 * Ziomek Audit Logger — TheCleanCode edition
 * Logs to brain/ directory (cross-project) and falls back to outputs/logs/ locally.
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { appendFile, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { ROOT } from './context.mjs';

// ROOT is E:/WebProjects/TheCleanCode, so the sibling project is one level up.
const BRAIN_DIR = process.env.BRAIN_DIR ?? path.resolve(ROOT, '../ziomek-city/brain');
const LOG_BASE  = existsSync(BRAIN_DIR) ? path.join(BRAIN_DIR, 'Logs') : path.join(ROOT, 'outputs', 'logs');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timestamp() {
  return new Date().toISOString();
}

function ensureDirSync(dir) {
  mkdirSync(dir, { recursive: true });
}

async function appendLog(subdir, entry) {
  const dir = path.join(LOG_BASE, subdir);
  await mkdir(dir, { recursive: true }).catch(() => {});
  await appendFile(path.join(dir, `${today()}.md`), entry + '\n', 'utf-8');
}

/**
 * Log every agent action.
 */
export async function logAction(opts) {
  const ts     = timestamp();
  const status = opts.result === 'FAILED' ? '❌' : '✅';
  const lines  = [
    `## ${status} [${ts}] ${opts.agent} — ${opts.action}`,
    `- **Method:** ${opts.method}`,
    opts.reason   ? `- **Reason:** ${opts.reason}` : null,
    opts.prompt   ? `- **Prompt:** \`${opts.prompt.slice(0, 200)}\`` : null,
    `- **Result:** ${opts.result}`,
    opts.output   ? `- **Output:** ${opts.output.slice(0, 300)}` : null,
    `- **Duration:** ${opts.durationMs}ms`,
    opts.costUSD != null ? `- **Cost:** $${opts.costUSD.toFixed(6)}` : null,
    '',
  ].filter(l => l !== null);

  await appendLog('actions', lines.join('\n'));

  if (opts.result === 'FAILED') {
    const errLines = [
      ...lines,
      opts.error ? `- **Error:** ${opts.error.message}` : null,
      opts.error?.stack ? `\`\`\`\n${opts.error.stack}\n\`\`\`` : null,
      opts.lastActions?.length
        ? `- **Last 5 actions:**\n${opts.lastActions.map(a => `  - ${a}`).join('\n')}`
        : null,
      '',
    ].filter(l => l !== null);
    await appendLog('errors', errLines.join('\n'));
  }
}

/**
 * Wrap any async function with retry + automatic logging.
 */
export async function withLogging(agent, action, method, fn, opts = {}) {
  const maxRetries  = opts.retries ?? 3;
  const lastActions = [];
  let attempt = 0;
  let lastErr;

  while (attempt < maxRetries) {
    attempt++;
    const start = Date.now();
    try {
      const result = await fn();
      await logAction({
        agent, action, method,
        result:    'SUCCESS',
        output:    typeof result === 'string' ? result : JSON.stringify(result)?.slice(0, 300),
        durationMs: Date.now() - start,
        reason:    opts.reason,
        prompt:    opts.prompt,
        costUSD:   opts.costUSD,
      });
      return result;
    } catch (err) {
      lastErr = err;
      lastActions.push(`[${timestamp()}] attempt ${attempt}: ${err.message}`);
      await logAction({
        agent, action: `${action} (attempt ${attempt})`, method,
        result:     'FAILED',
        durationMs: Date.now() - start,
        reason:     opts.reason,
        prompt:     opts.prompt,
        error:      err,
        lastActions: [...lastActions],
      });
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastErr;
}
