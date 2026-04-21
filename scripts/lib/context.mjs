// Shared pipeline context — persisted to outputs/context.json between agent runs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
const CONTEXT_FILE = path.join(ROOT, "outputs/context.json");

export function readContext() {
  if (!fs.existsSync(CONTEXT_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf8"));
}

export function writeContext(data) {
  const current = readContext();
  const merged = { ...current, ...data };
  fs.mkdirSync(path.dirname(CONTEXT_FILE), { recursive: true });
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

export function clearContext() {
  fs.writeFileSync(CONTEXT_FILE, "{}", "utf8");
}

export { ROOT };
