// Factory status writer — keeps outputs/factory-status.json current as agents run
import fs from "fs";
import path from "path";
import { ROOT } from "./context.mjs";

const STATUS_FILE = path.join(ROOT, "outputs/factory-status.json");

const AGENT_NAMES = ["Scout", "Amazon", "Scribe", "Image", "Publisher", "Spark", "Reel", "Mailer"];

function emptyAgents() {
  return Object.fromEntries(
    AGENT_NAMES.map((name) => [name, { status: "idle", lastMessage: "", updatedAt: null }])
  );
}

export function readStatus() {
  if (!fs.existsSync(STATUS_FILE)) return buildInitial();
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
  } catch {
    return buildInitial();
  }
}

function buildInitial() {
  return {
    isRunning: false,
    currentAgent: null,
    lastUpdate: null,
    lastRunDate: null,
    agents: emptyAgents(),
    stats: {
      totalPostsPublished: 0,
      totalSocialCaptions: 0,
      lastPostTitle: null,
      lastPostSlug: null,
    },
    activityFeed: [],
  };
}

function save(status) {
  status.lastUpdate = new Date().toISOString();
  fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
}

function pushActivity(status, message) {
  const feed = status.activityFeed ?? [];
  feed.unshift({ message, time: new Date().toISOString() });
  status.activityFeed = feed.slice(0, 30); // keep last 30 entries
}

export function initFactoryRun() {
  const status = readStatus();
  status.isRunning = true;
  status.currentAgent = null;
  status.lastRunDate = new Date().toISOString();
  status.agents = emptyAgents();
  pushActivity(status, "Factory run started");
  save(status);
}

export function setAgentRunning(agentName, message = "") {
  const status = readStatus();
  status.currentAgent = agentName;
  status.agents[agentName] = {
    status: "running",
    lastMessage: message,
    updatedAt: new Date().toISOString(),
  };
  pushActivity(status, `[${agentName}] ${message || "Started"}`);
  save(status);
}

export function setAgentComplete(agentName, message = "") {
  const status = readStatus();
  if (status.agents[agentName]) {
    status.agents[agentName].status = "complete";
    status.agents[agentName].lastMessage = message || "Done";
    status.agents[agentName].updatedAt = new Date().toISOString();
  }
  pushActivity(status, `[${agentName}] ✓ ${message || "Complete"}`);
  save(status);
}

export function setAgentError(agentName, message = "") {
  const status = readStatus();
  if (status.agents[agentName]) {
    status.agents[agentName].status = "error";
    status.agents[agentName].lastMessage = message || "Failed";
    status.agents[agentName].updatedAt = new Date().toISOString();
  }
  pushActivity(status, `[${agentName}] ✗ ${message || "Error"}`);
  save(status);
}

export function setAgentSkipped(agentName) {
  const status = readStatus();
  if (status.agents[agentName]) {
    status.agents[agentName].status = "skipped";
    status.agents[agentName].lastMessage = "Skipped";
    status.agents[agentName].updatedAt = new Date().toISOString();
  }
  save(status);
}

export function setFactoryComplete(stats = {}) {
  const status = readStatus();
  status.isRunning = false;
  status.currentAgent = null;
  if (stats.lastPostTitle) status.stats.lastPostTitle = stats.lastPostTitle;
  if (stats.lastPostSlug) status.stats.lastPostSlug = stats.lastPostSlug;
  if (stats.totalPostsPublished != null) status.stats.totalPostsPublished = stats.totalPostsPublished;
  if (stats.totalSocialCaptions != null) status.stats.totalSocialCaptions = stats.totalSocialCaptions;
  pushActivity(status, "Factory run complete");
  save(status);
}
