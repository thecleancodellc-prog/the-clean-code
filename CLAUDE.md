# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint via Next.js
```

## Architecture

**Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Framer Motion, styled-components.

**Content is data-driven, not CMS-driven.** All blog posts live in `data/posts.js` as objects with full HTML content strings. Products live in `data/products.js`. Adding content means editing these files.

### Directory overview

- `app/(site)/` — route group for main marketing pages (homepage, blog, shop, about, etc.)
- `app/guides/` — guide pages organized by category (`[category]/page.js`)
- `app/api/newsletter/` — MailerLite subscription POST endpoint
- `app/sitemap.js` — dynamically generated XML sitemap
- `components/` — shared UI: Header (sticky nav + mobile drawer), Footer, Hero, AdSlot, AdRail, ProductCard, CookieConsent
- `data/` — source of truth for posts, products, categories, and global SEO defaults
- `utils/` — `getReadingTime.js` (parses HTML → ISO 8601 duration), `shopMeta.js` (per-category metadata)
- `lib/live.js` — Sanity Live Content API stub (not actively used)

### Routing patterns

- Blog posts: `app/(site)/blog/[slug]/page.js` — slug matches `id` field in `data/posts.js`
- Products: `app/(site)/shop/[id]/page.js` — id matches `id` field in `data/products.js`
- Guides: `app/guides/[category]/page.js`
- Dynamic metadata is generated via `generateMetadata()` in each route file

### Component patterns

- Pages that use Framer Motion animations require `"use client"` at the top
- Root layout (`app/layout.js`) is a server component; it wraps all pages with Header, Footer, CookieConsent
- Ad placements use `<AdSlot>` (inline) and `<AdRail>` (desktop sidebar columns) — these are Google AdSense placeholders
- Blog post pages use a three-column desktop layout: left AdRail | content | right AdRail

### Styling

- Tailwind with custom theme colors: `brand` (emerald green palette, e.g. `brand-600` = `#1f4135`) and `ink` (grays)
- Global CSS variables and dark mode detection in `app/globals.css`
- Framer Motion handles entrance animations (fade-up, stagger containers)

### SEO

- Global defaults in `data/seoDefaults.js`
- Each blog post object in `data/posts.js` carries `seo` fields (title, description, og image)
- JSON-LD structured data is embedded directly in page components

### Environment variables

```
NEXT_PUBLIC_SANITY_PROJECT_ID=h7qre274
NEXT_PUBLIC_SANITY_DATASET=production
```
Sanity is configured but not actively wired to content — posts/products are static data files.
