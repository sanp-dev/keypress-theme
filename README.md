# DEMO BLOG - Modern Web Publishing Platform

## About

A modern, fully functional web publishing platform built with Astro and Cloudflare Pages, designed for fast, scalable, and customizable websites.

## Live Demo button

🌐 https://demo-blog.quicdecode.com

## Author & Developer

Created and maintained by **Sandhata Prajapati**, an independent web developer focused on modern web technologies, cloud-native applications, and practical software development.

---

## 🚀 Key Features

- **Blazing Fast Performance**: Built on Astro 7 and Tailwind CSS, generating static HTML with zero unnecessary client-side JavaScript.
- **Cloudflare Native Integration**: Edge functions for email subscriptions (Cloudflare D1), page views tracking (Cloudflare KV), and contact forms.
- **Instant Search**: Full-text client search powered by Pagefind and interactive search overlays.
- **Dynamic Load More Pagination**: Smooth client-side pagination loading stories dynamically without full page reloads.
- **Built-in Sitemaps & RSS Feeds**: Automatic XML sitemaps (`/sitemap-posts.xml`), visual sitemap (`/sitemap/`), and RSS feed (`/rss.xml`).
- **Flexible Branding & Color Systems**: Customize website name, domain, multi-color logo letters, and social media handles from a single configuration file (`src/config/site.ts`).
- **Google AdSense Ready**: High-performance AdSense integration with optional lazy-loading to keep PageSpeed scores at 100/100.
- **PWA & Push Notification Ready**: Offline support with Service Worker and Firebase Web Push notification component.

---

## 📂 Project Structure

```text
D:\DEMO-BLOG-QUICDECODE\
├── functions/               # Cloudflare Pages Edge Functions
│   ├── api/                 # API endpoints (subscribe, contact, track-view)
│   └── _middleware.js       # Cloudflare Pages Edge Middleware (410 Gone, routing)
├── public/                  # Static assets (favicons, manifests, sw.js)
├── src/
│   ├── components/          # Reusable UI components (Header, Footer, PostCard, Hero, etc.)
│   ├── config/              # Centralized site configuration (site.ts, authors.ts)
│   ├── content/             # Markdown blog posts collection
│   ├── layouts/             # Base HTML layouts
│   ├── pages/               # Astro file-based routes
│   └── styles/              # Global CSS styles
├── .env.example             # Template environment variables
├── astro.config.mjs         # Astro framework configuration
├── package.json             # Project metadata & dependencies
└── wrangler.toml            # Cloudflare D1 & KV bindings configuration
```

---

## 🛠️ Quick Start Guide

### 1. Clone & Install Dependencies

Requires Node.js (version 22.12.0 or higher):

```bash
git clone https://github.com/SandhataPrajapati/demo-blog.git
cd demo-blog
npm install
```

### 2. Configure Site Settings

Open `src/config/site.ts` and update `SITE_CONFIG`:

```typescript
export const SITE_CONFIG: SiteConfig = {
  name: "DEMO BLOG - Modern Web Publishing Platform",
  domain: "https://demo-blog.quicdecode.com",
  contactEmail: "contact@quicdecode.com",
  title: "DEMO BLOG - Modern Web Publishing Platform",
  description: "A modern, fully functional web publishing platform built with Astro and Cloudflare Pages...",
  // Customize logo letters and social handles below...
};
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 4. Run Local Development Server

```bash
npm run dev
```

Open `http://localhost:4321` in your browser.

---

## 🧞 Project Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts local development server at `http://localhost:4321` |
| `npm run build` | Builds static production site & Pagefind search index to `./dist/` |
| `npm run preview` | Previews the built production site locally |

---

## ☁️ Deploying to Cloudflare Pages

This template is optimized for Cloudflare Pages with D1 Database & KV Namespace:

1. **Push to GitHub**: Push your cloned repository to your GitHub account.
2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
   - Select your repository.
   - Set Build Command: `npm run build`
   - Set Build Output Directory: `dist`
3. **Configure Cloudflare Bindings** (`wrangler.toml`):
   - **D1 Database**: Set binding `DB` for email subscriptions.
   - **KV Namespace**: Set binding `POST_VIEWS` for page view tracking.

---

## 📄 License

This project is open-source under the MIT License.
