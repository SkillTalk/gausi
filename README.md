# Gausi Digital Marketing

A production-ready marketing website built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Tech
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Forms with API routes (console logging placeholders)
- SEO: Metadata, OpenGraph, robots, sitemap, JSON-LD
- Performance: responsive, accessible, Image optimization (Next/Image with SVG placeholders)

## Getting Started

1) Install dependencies:
```bash
npm install
```

2) Run the dev server:
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

3) Build for production:
```bash
npm run build
npm start
```

## Edit Content
All editable copy and data is centralized in:

`src/content/content.ts`
- `siteConfig`: name, taglines, nav, contact, stats
- `services`: array of services with slug, details, deliverables, pricing
- `caseStudies`: 3 placeholders with problem/approach/result/metrics
- `blogPosts`: 5 starter posts (title, date, excerpt, content)

## Email & Forms
Forms post to API routes and log submissions to the server console (placeholders):
- `src/app/api/contact/route.ts`
- `src/app/api/audit/route.ts`

Replace the `console.log` with your email provider or Nodemailer integration.

## SEO
- Per-page `metadata` for title/description/OG/Twitter
- Organization JSON-LD on all pages (in `layout.tsx`)
- LocalBusiness JSON-LD on Contact page
- `src/app/robots.ts` and `src/app/sitemap.ts`

## Deploy (Vercel)
1) Push this repo to GitHub
2) Import in Vercel
3) Set `Production Branch`
4) Deploy

## File Structure
```
src/
  app/
    api/
      contact/route.ts
      audit/route.ts
    (routes...)
  components/ (UI components)
  content/content.ts (editable content)
  lib/ (helpers)
public/ (assets)
```

## Extras
- Floating WhatsApp button (`FloatingWhatsApp`)
- Sticky mobile “Free Audit” CTA (`StickyAuditCTA`)
- Analytics placeholder (commented) in `src/app/layout.tsx`


