// Mailer — generates newsletter email content and optionally sends via MailerLite
// Usage: node --env-file=.env.local scripts/agents/mailer.mjs
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { readContext, writeContext, ROOT } from "../lib/context.mjs";
import { step, info, warn } from "../lib/log.mjs";

const AGENT = "Mailer";

export async function run() {
  const ctx = readContext();
  if (!ctx.postData) throw new Error("No postData in context. Run Scribe first.");

  const { title, excerpt, slug, categories } = ctx.postData;
  step(AGENT, `Drafting newsletter for: "${title}"`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You write newsletter emails for "The Clean Code" — a clean-living, non-toxic home wellness brand. Voice: personal, warm, like a knowledgeable friend texting you. Subject lines should have high open rates. Avoid spammy words. No excessive emojis.`,
      },
      {
        role: "user",
        content: `Write a newsletter email announcing this new blog post:

Title: "${title}"
Excerpt: "${excerpt}"
Post URL: https://thecleancode.com/blog/${slug}
Categories: ${categories.join(", ")}
Product spotlight: ${ctx.product ? `${ctx.product.title} — ${ctx.product.description}` : "none"}

Return JSON:
{
  "subject": "Email subject line (under 60 chars)",
  "preheader": "Preview text (under 100 chars)",
  "body": "Full email body in plain text, with a clear CTA button label and URL at the end"
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const email = JSON.parse(response.choices[0].message.content);

  // Save to outputs/emails/
  const outDir = path.join(ROOT, "outputs/emails");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${slug}-email.txt`);
  const content = [
    `NEWSLETTER — ${title}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `SUBJECT: ${email.subject}`,
    `PREHEADER: ${email.preheader}`,
    "",
    "═══════════════════════════════════",
    "BODY",
    "═══════════════════════════════════",
    email.body,
  ].join("\n");

  fs.writeFileSync(outFile, content, "utf8");
  info(AGENT, `Email draft saved to outputs/emails/${slug}-email.txt`);

  // Optionally send via MailerLite if API key is present
  if (process.env.MAILERLITE_API_KEY) {
    step(AGENT, "Sending campaign via MailerLite...");
    try {
      const mlRes = await fetch("https://connect.mailerlite.com/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
        },
        body: JSON.stringify({
          name: `${title} — ${new Date().toLocaleDateString()}`,
          type: "regular",
          subject: email.subject,
          from: "hello@thecleancode.com",
          from_name: "The Clean Code",
          content: { plain_text: email.body },
        }),
      });

      if (mlRes.ok) {
        const mlData = await mlRes.json();
        info(AGENT, `MailerLite campaign created (ID: ${mlData.data?.id})`);
        writeContext({ emailCampaignId: mlData.data?.id });
      } else {
        const err = await mlRes.text();
        warn(AGENT, `MailerLite API error: ${err}`);
      }
    } catch (e) {
      warn(AGENT, `MailerLite send failed: ${e.message}`);
    }
  } else {
    warn(AGENT, "MAILERLITE_API_KEY not set — email saved locally only.");
  }

  const updated = writeContext({ email, emailFile: `outputs/emails/${slug}-email.txt` });
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("mailer.mjs")) {
  await run();
}
