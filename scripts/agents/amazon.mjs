// Amazon — finds and scrapes a real affiliate product for the current topic
// Uses Playwright with 3 self-healing fallback strategies.
// Falls back to OpenAI suggestion if all scraping attempts fail.
// Usage: node --env-file=.env.local scripts/agents/amazon.mjs

import OpenAI from "openai";
import { readContext, writeContext } from "../lib/context.mjs";
import { step, info, warn } from "../lib/log.mjs";

const AGENT = "Amazon";
const AMAZON_TAG = process.env.AMAZON_ASSOCIATE_TAG || "thecleancod02-20";

function cleanProductTitle(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidProduct(product) {
  if (!product?.asin || !/^[A-Z0-9]{10}$/i.test(product.asin)) return false;
  const title = cleanProductTitle(product.title);
  if (title.length < 12 || title.length > 220) return false;
  if (/[<>]/.test(product.title || "")) return false;
  if (/prime|fallback|sprite|image|\.jpg|\.png|\/gp\/prime/i.test(product.title || "")) return false;
  if (!/amazon\.com\/dp\//i.test(product.affiliateUrl || "")) return false;
  product.title = title;
  product.affiliateUrl = tagUrl(product.affiliateUrl);
  return true;
}

function tagUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.set('tag', AMAZON_TAG);
    return u.toString();
  } catch {
    return url + (url.includes('?') ? '&' : '?') + `tag=${AMAZON_TAG}`;
  }
}

// ─── Playwright scraping strategies ────────────────────────────────────────────

async function tryStrategy1(browser, query) {
  // Strategy 1: Direct Amazon search URL, wait for results grid
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=aps&tag=${AMAZON_TAG}`, {
      waitUntil: 'domcontentloaded', timeout: 15_000,
    });
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 8_000 });

    const product = await page.evaluate((tag) => {
      const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
      for (const card of cards) {
        const titleEl = card.querySelector('h2 a span, h2 span');
        const priceEl = card.querySelector('.a-price .a-offscreen, .a-price-whole');
        const ratingEl = card.querySelector('.a-icon-star-small .a-icon-alt, [aria-label*="stars"]');
        const asinEl = card.closest('[data-asin]');
        const asin = asinEl?.dataset.asin;
        if (!titleEl || !asin || asin.length !== 10) continue;

        const title = titleEl.textContent.trim();
        const price = priceEl?.textContent.trim() ?? 'N/A';
        const rating = ratingEl?.textContent.trim() ?? '';

        return {
          title,
          asin,
          price,
          rating,
          affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=${tag}`,
          image: `/images/products/${asin.toLowerCase()}.jpg`,
        };
      }
      return null;
    }, AMAZON_TAG);

    return product;
  } finally {
    await page.close().catch(() => {});
  }
}

async function tryStrategy2(browser, query) {
  // Strategy 2: Amazon search with mobile UA + explicit product card selector
  // Playwright sets the UA per context (page.setUserAgent is Puppeteer-only).
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  try {
    await page.goto(`https://www.amazon.com/s?k=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle', timeout: 18_000,
    });

    const product = await page.evaluate((tag) => {
      // Mobile Amazon uses different selectors
      const items = document.querySelectorAll('[data-asin]:not([data-asin=""])');
      for (const item of items) {
        const asin = item.dataset.asin;
        if (!asin || asin.length !== 10) continue;
        const titleEl = item.querySelector('span.a-text-normal, .s-title-instructions-style span');
        const priceEl = item.querySelector('.a-price .a-offscreen');
        if (!titleEl) continue;
        return {
          title: titleEl.textContent.trim(),
          asin,
          price: priceEl?.textContent.trim() ?? 'N/A',
          affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=${tag}`,
          image: `/images/products/${asin.toLowerCase()}.jpg`,
          rating: '',
        };
      }
      return null;
    }, AMAZON_TAG);

    return product;
  } finally {
    await context.close().catch(() => {});
  }
}

async function tryStrategy3(browser, query) {
  // Strategy 3: Navigate to product listing and scrape title/ASIN from URL pattern
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    // Use Amazon's OpenSearch to get a direct product link
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss`;
    const response = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);

    const content = await page.content();

    // Parse ASIN from page HTML directly
    const asinMatch = content.match(/data-asin="([A-Z0-9]{10})"/);
    const titleMatch = content.match(/"title":"([^"]{10,200})"/);

    if (asinMatch) {
      const asin  = asinMatch[1];
      const title = titleMatch ? titleMatch[1].replace(/\\u[\dA-F]{4}/gi, '?') : `Product for ${query}`;
      return {
        title,
        asin,
        price: 'N/A',
        affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`,
        image: `/images/products/${asin.toLowerCase()}.jpg`,
        rating: '',
      };
    }
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeAmazon(query) {
  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const strategies = [
      { name: 'desktop-dom',    fn: tryStrategy1 },
      { name: 'mobile-ua',     fn: tryStrategy2 },
      { name: 'html-parse',    fn: tryStrategy3 },
    ];

    for (const { name, fn } of strategies) {
      step(AGENT, `  Trying strategy: ${name}…`);
      try {
        const result = await fn(browser, query);
        if (isValidProduct(result)) {
          info(AGENT, `  Found via ${name}: ${result.title}`);
          return result;
        }
        warn(AGENT, `  Strategy ${name}: no product found`);
      } catch (err) {
        warn(AGENT, `  Strategy ${name} failed: ${err.message}`);
      }
      // Small delay between retries
      await new Promise(r => setTimeout(r, 1500));
    }

    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}

// ─── OpenAI fallback ───────────────────────────────────────────────────────────

async function suggestViaAI(topic) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a product researcher for "The Clean Code" — an eco-friendly, non-toxic home living blog that earns via Amazon affiliate links.`,
      },
      {
        role: "user",
        content: `Suggest the single best real Amazon product for: "${topic}"
Requirements: non-toxic/eco-friendly, $10–$60, well-reviewed.
Respond with JSON only:
{"title":"...","brand":"...","image":"/images/products/[slug].jpg","affiliateUrl":"https://www.amazon.com/dp/[ASIN]?tag=${AMAZON_TAG}","description":"1–2 sentences.","price":"$XX.XX","asin":"XXXXXXXXXX"}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const product = JSON.parse(response.choices[0].message.content);
  // Enforce correct tag regardless of what the model returned
  if (product.affiliateUrl) product.affiliateUrl = tagUrl(product.affiliateUrl);
  if (!isValidProduct(product)) throw new Error("AI fallback returned an invalid Amazon product.");
  return product;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export async function run() {
  const ctx = readContext();
  if (!ctx.topic) throw new Error("No topic in context. Run Scout first.");

  step(AGENT, `Finding affiliate product for: "${ctx.topic}"`);

  const searchQuery = `eco friendly ${ctx.topic} non toxic`;
  let product = null;

  // Attempt Playwright scraping first
  step(AGENT, "Attempting Playwright Amazon scraping (3 strategies)…");
  try {
    const scraped = await scrapeAmazon(searchQuery);
    if (scraped) {
      product = {
        title:        scraped.title,
        brand:        '',
        image:        scraped.image,
        affiliateUrl: scraped.affiliateUrl,
        description:  `Top-rated eco-friendly product for ${ctx.topic}. Available on Amazon.`,
        price:        scraped.price,
        asin:         scraped.asin,
        source:       'scraped',
      };
    }
  } catch (err) {
    warn(AGENT, `Playwright scraping error: ${err.message}`);
  }

  // Fall back to OpenAI suggestion
  if (!product) {
    warn(AGENT, "All scraping strategies failed — falling back to AI suggestion.");
    product = await suggestViaAI(ctx.topic);
    product.source = 'ai-suggested';
  }

  info(AGENT, `Product: ${product.title} (${product.price}) [via ${product.source}]`);
  if (product.asin) info(AGENT, `ASIN: ${product.asin}`);

  const updated = writeContext({ product });
  info(AGENT, "Product saved to context.");
  return updated;
}

// Standalone entry point
if (process.argv[1].includes("amazon.mjs")) {
  await run();
}

