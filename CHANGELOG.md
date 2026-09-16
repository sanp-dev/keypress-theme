# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-09-16

### Added
- **Zero-Failure High-Scale SSG Build Architecture** for Cloudflare Pages CI:
  - `src/plugins/image-validator.mjs` — 20-worker sliding-window pool (was unbounded `Promise.all`), 8 s `AbortController` timeout (was 3 s), 2-attempt retry with 500 ms backoff, WAF/bot-protection whitelist expanded to include HTTP `400` alongside `403` and `405`. Timer always cleared in `finally` block to prevent leaks.
  - `src/utils/image.ts` — `cleanImageUrl()` now returns `/default-og-image.jpg` for any empty/null/undefined URL (was returning `''`, which could crash `<Image src="" />`).
  - `src/utils/posts-api.ts` — New shared build-time utility: converts raw Astro content entries to serialisable `{ id, title, description, category, pubDate, image1x, image2x }` page chunks. All `getImage()` calls wrapped in `try/catch` — a bad URL never crashes the build.

- **Static JSON Pagination API** — pre-generated at build time, served from Cloudflare CDN:
  - `src/pages/api/posts/home/[page].json.ts` — `/api/posts/home/2.json`, `3.json` … for home page "Load More".
  - `src/pages/api/posts/category/[slug]/[page].json.ts` — `/api/posts/category/{slug}/2.json` … for category pages.
  - `src/pages/api/posts/label/[tag]/[page].json.ts` — `/api/posts/label/{tag}/2.json` … for label/tag pages.
  - `src/pages/api/posts/author/[slug]/[page].json.ts` — `/api/posts/author/{slug}/2.json` … for author pages.
  - All endpoints include a `hasMore` boolean so clients know when to hide the button.
  - All JSON files served with `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.

### Changed
- **`src/pages/index.astro`** — Removed `Promise.all` over ALL posts that processed every image at build time regardless of post count. Now only the first 6 posts are rendered as static HTML. "Load More" button uses `fetch('/api/posts/home/${page}.json')` — zero build memory overhead regardless of total post count.
- **`src/pages/category/[name].astro`** — Same architecture change as index.astro. Removed `clientPosts` Promise.all; fetch-based pagination via `/api/posts/category/{slug}/{page}.json`.
- **`src/pages/label/[tag].astro`** — Same architecture change. Removed `clientPosts` Promise.all; fetch-based pagination via `/api/posts/label/{tag}/{page}.json`.
- **`src/pages/author/[name].astro`** — Replaced CSS `display:none` hide/show trick (all posts rendered into DOM at once) with proper fetch-based pagination. Only first `POSTS_PER_PAGE` articles rendered as HTML; subsequent pages loaded via `/api/posts/author/{slug}/{page}.json`.
- **`package.json`** — Node engine requirement bumped from `>=22.12.0` to `>=24.19.0` for native `fetch`, modern `AbortController` support, and Cloudflare Pages CI compatibility. Added `allowScripts` entry for esbuild.

### Architecture Notes
> **Cloudflare Pages Dashboard:** Set environment variable `NODE_VERSION = 24.19.0` in Settings → Environment Variables to match the new engine requirement.

---

## [1.0.0] - 2026-08-11

### Added
- Initial release of **Keypress Theme** platform template built with Astro & Cloudflare Pages.
- Configurable `showAdPlaceholders` toggle in `src/config/site.ts` to show/hide demo ad placement banners.
- Edge functions integration for Cloudflare D1 (newsletter subscriptions) and KV (page view tracking).
- Client-side full-text search powered by Pagefind, built-in RSS feeds, and XML sitemaps.
