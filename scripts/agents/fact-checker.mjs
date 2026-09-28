// Fact Checker - verifies every drafted article before images or publishing.
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { inspectPost } from "../lib/content-quality.mjs";
import { step, info } from "../lib/log.mjs";

const AGENT = "Fact Checker";
const REPORT_DIR = path.join(ROOT, "outputs", "fact-checks");

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          reason: { type: "string" },
          recommendation: { type: "string" },
          sourceUrls: { type: "array", items: { type: "string" } },
        },
        required: ["claim", "severity", "reason", "recommendation", "sourceUrls"],
        additionalProperties: false,
      },
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, url: { type: "string" } },
        required: ["title", "url"],
        additionalProperties: false,
      },
    },
  },
  required: ["approved", "riskLevel", "summary", "findings", "sources"],
  additionalProperties: false,
};

function saveReport(slug, report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${slug}.json`);
  fs.writeFileSync(file, JSON.stringify({ checkedAt: new Date().toISOString(), ...report }, null, 2), "utf8");
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function normalizeSourceUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref" || key === "source") url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").replace(/\/$/, "");
  }
}

function collectSearchUrls(response) {
  const urls = new Set();
  for (const item of response.output || []) {
    for (const source of item.action?.sources || []) {
      if (source.url) urls.add(normalizeSourceUrl(source.url));
    }
    for (const part of item.content || []) {
      for (const annotation of part.annotations || []) {
        const url = annotation.url || annotation.url_citation?.url;
        if (url) urls.add(normalizeSourceUrl(url));
      }
    }
  }
  return urls;
}

export async function run() {
  const ctx = readContext();
  const post = ctx.postData;
  if (!post) throw new Error("No postData in context. Run Scribe first.");

  step(AGENT, `Checking facts and safety for: "${post.title}"`);
  const deterministic = inspectPost(post);
  if (!deterministic.ok) {
    const reportPath = saveReport(post.slug, {
      approved: false,
      riskLevel: "high",
      summary: "Deterministic publishing checks failed.",
      findings: deterministic.issues.map((reason) => ({
        claim: "Automated content check",
        severity: "high",
        reason,
        recommendation: "Correct the draft before publishing.",
        sourceUrls: [],
      })),
      sources: [],
    });
    writeContext({ factCheck: { approved: false, reportPath } });
    throw new Error(`Fact check blocked publication: ${deterministic.issues.join(" ")}`);
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for web fact checking.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.FACT_CHECK_MODEL || "gpt-4.1-mini",
    tools: [{ type: "web_search" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    input: [
      {
        role: "system",
        content: `You are the independent fact checker for The Clean Code. Verify concrete factual claims using live web search. Prefer government agencies, universities, standards bodies, peer-reviewed research, and recognized veterinary or medical authorities. Focus especially on health, pets, children, chemicals, fire, electricity, mold, food safety, environmental claims, certifications, and numerical claims. Reject dangerous advice, categorical safety claims, or material claims that credible sources do not support. Low-risk lifestyle suggestions do not require a finding. Set approved=false if any medium or high finding remains. Every finding must cite at least one supporting source URL.`,
      },
      {
        role: "user",
        content: `Fact-check this proposed article before it is published.\n\nTITLE: ${post.title}\n\nHTML:\n${post.content}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "fact_check_report",
        strict: true,
        schema: REPORT_SCHEMA,
      },
    },
  });

  const report = JSON.parse(response.output_text);
  const searchedUrls = collectSearchUrls(response);
  const unsupportedCitations = report.findings.flatMap((finding) =>
    finding.sourceUrls.filter((url) => !searchedUrls.has(normalizeSourceUrl(url)))
  );
  if (report.findings.length && (!searchedUrls.size || unsupportedCitations.length)) {
    report.approved = false;
    report.riskLevel = "high";
    report.summary = `${report.summary} Citation validation failed; one or more finding URLs were not returned by web search.`;
  }
  const reportPath = saveReport(post.slug, report);
  writeContext({ factCheck: { ...report, reportPath } });
  info(AGENT, `${report.approved ? "Approved" : "Blocked"}: ${report.summary}`);
  if (!report.approved) throw new Error(`Fact check blocked publication. Review ${reportPath}`);
  return readContext();
}

if (process.argv[1]?.includes("fact-checker.mjs")) await run();
