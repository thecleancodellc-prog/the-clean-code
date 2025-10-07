# The Clean Code — SEO-first Next.js Starter

A fast, clean-living site with blog, guides, curated shop, JSON-LD, sitemap, robots, and AdSense placeholders.

## Quick Start

```bash
# 1) Unzip
cd the-clean-code-starter

# 2) Install deps
npm install

# 3) Dev server
npm run dev
# open http://localhost:3000
```

## Customize

- Replace `public/icon.png` and `public/og-default.jpg` with your assets.
- Update brand copy in `app/layout.js` and components.
- Add blog posts via `data/posts.js` (or we can switch to MDX later).
- Add products in `data/products.js` with actual `affiliateUrl` links.
- AdSense: replace `data-ad-client` and `data-ad-slot` in `components/AdSlot.js` after approval.

## SEO

- Uses Next.js `metadata`, OpenGraph tags, JSON-LD in posts, sitemap and robots.
- Clean, fast markup and Tailwind for style.
- Simple categories under `/guides` and a curated `/shop` for affiliate monetization.

## Deploy

- Vercel: import the repo and deploy (automatic).
- Netlify/Render: build command `npm run build`, output `.next` (framework preset may auto-detect).

---

Need help wiring MDX, CMS (Notion/Hygraph), or more pages? We can extend this base together.
