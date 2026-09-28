import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
export const SAFE_CHECKPOINT = 'v1-5-pruned-emaonly-fp16.safetensors';
export function assertCheckpoint(name) {
  if (name !== SAFE_CHECKPOINT) throw new Error(`Checkpoint blocked: ${name}. Only ${SAFE_CHECKPOINT} is allowed for Clean Code.`);
  return name;
}
export async function checkImage(file) {
  try {
    const { stdout } = await exec('E:/AI/ComfyUI/.venv/Scripts/python.exe', [path.join(here, 'image-safety-check.py'), file], {
      timeout: 180000, windowsHide: true, maxBuffer: 1024 * 1024,
      env: { ...process.env, HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1' }
    });
    const report = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
    if (file === '--check') {
      if (report.ready !== true) throw new Error('Safety models are not ready');
    } else if (report.passed !== true || report.version !== 1 || !Number.isFinite(report.personScore) || !Number.isFinite(report.nsfwScore) || report.personScore >= 0.20 || report.nsfwScore >= 0.10) {
      throw new Error('Image failed safety checks');
    }
    return report;
  } catch (error) {
    throw new Error('Image safety blocked: person/NSFW detected or screening unavailable.', { cause: error });
  }
}
export async function screenAndSave(bytes, destination) {
  const staging = 'E:/AI/safety/staging';
  fs.mkdirSync(staging, { recursive: true });
  const temporary = path.join(staging, randomUUID() + '.png');
  fs.writeFileSync(temporary, bytes);
  try {
    const report = await checkImage(temporary);
    report.sha256 = createHash('sha256').update(bytes).digest('hex');
    report.checkedAt = new Date().toISOString();
    fs.writeFileSync(destination, bytes);
    fs.writeFileSync(destination + '.safety.json', JSON.stringify(report, null, 2));
    return report;
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}
