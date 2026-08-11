# DEMO BLOG — Developer & Architecture Setup Guide

This guide details the technical configuration, Cloudflare D1 & KV bindings, Edge functions setup, and customization for the **DEMO BLOG** platform template.

---

## 📋 Table of Contents

1. [Quick Start](#1-quick-start)
2. [Global Settings (`src/config/site.ts`)](#2-global-settings-srcconfigsitets)
3. [Environment Variables (`.env.example`)](#3-environment-variables-envexample)
4. [Cloudflare D1 Database & KV Setup](#4-cloudflare-d1-database--kv-setup)
5. [Edge API Functions](#5-edge-api-functions)
6. [Contact Form & Webhook Setup](#6-contact-form--webhook-setup)
7. [Firebase Push Notifications Setup](#7-firebase-push-notifications-setup)
8. [Google AdSense Integration](#8-google-adsense-integration)

---

## 1. Quick Start

Install dependencies (requires Node.js v22.12.0+):

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build production bundle and Pagefind search index:

```bash
npm run build
```

---

## 2. Global Settings (`src/config/site.ts`)

Customize website branding, domain, logo, and social handles in `src/config/site.ts`:

```typescript
export const SITE_CONFIG: SiteConfig = {
  name: "DEMO BLOG - Modern Web Publishing Platform",
  domain: "https://demo-blog.quicdecode.com",               // Canonical domain
  cdnDomain: "https://demo-cdn.quicdecode.com",            // CDN subdomain for images
  contactEmail: "contact@quicdecode.com",                 // Shown on legal & contact pages

  title: "DEMO BLOG - Modern Web Publishing Platform",
  description: "A modern, fully functional web publishing platform built with Astro and Cloudflare Pages...",
  defaultOgImage: "/default-og-image.jpg",
  themeColor: "#1a73e8",

  // Multi-color logo letters (Google-inspired)
  logoLetters: [
    { char: "Q", color: "text-[#1a73e8]" },
    { char: "D", color: "text-[#d93025]" },
  ],
  logoTextSuffix: "DEMO BLOG",

  socials: {
    github: "https://github.com/sanp-dev",
  }
};
```

---

## 3. Environment Variables (`.env.example`)

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Available keys:
- `PUBLIC_GA_ID`: Google Analytics measurement ID (e.g. `G-XXXXXXXXXX`).
- `PUBLIC_CLARITY_ID`: Microsoft Clarity project ID.
- `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`: GA4 Data API credentials for popular posts feature (Optional).
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: Cloudflare R2 bucket credentials for media assets (Optional).
- `FIREBASE_SECRET`, `FIREBASE_URL`, `GEMINI_API_KEY`: Push notifications & AI services (Optional).

> **Note on Licensing**: This project is 100% open-source under the MIT License. There are no license enforcement scripts, activation keys, or paywalls required.

---

## 4. Cloudflare D1 Database & KV Setup

This platform is optimized for Cloudflare Pages and utilizes two edge bindings:
1. **`DB`** (Cloudflare D1 Database): Used for storing newsletter email subscriptions.
2. **`POST_VIEWS`** (Cloudflare KV Namespace): Used for real-time article view counting and tracking.

### Setting Bindings in Cloudflare Pages Dashboard

1. Navigate to **Cloudflare Dashboard** → **Workers & Pages** → Select your Pages Project.
2. Go to **Settings** → **Functions** → **D1 Database Bindings**:
   - Click **Add binding**.
   - **Variable name**: `DB`
   - **D1 Database**: Select your created D1 database (e.g., `demo-blog-db`).
3. Under **KV Namespace Bindings**:
   - Click **Add binding**.
   - **Variable name**: `POST_VIEWS`
   - **KV namespace**: Select your created KV namespace.

### Creating D1 & KV via Cloudflare CLI (Wrangler)

If you are setting up new databases via command line:

```bash
# Create D1 database for email subscribers
npx wrangler d1 create my-blog-db

# Create KV namespace for page view tracking
npx wrangler kv namespace create MY_BLOG_KV
```

After creation, attach them to your Cloudflare Pages project settings as shown above.

---

## 5. Edge API Functions

API routes located in `functions/api/`:

- **`functions/api/subscribe.js`**: Handles newsletter subscriptions using D1 binding `DB`. Creates table `subscribers` automatically.
- **`functions/api/track-view.js`**: Tracks article pageviews asynchronously using KV binding `POST_VIEWS`.
- **`functions/api/contact.js`**: Receives contact form submissions and forwards them securely to a webhook.

---

## 6. Contact Form & Webhook Setup

To receive contact form submissions via email or Google Sheets:

1. Create a Google Apps Script ([script.google.com](https://script.google.com/)):
   ```javascript
   function doPost(e) {
     var data = JSON.parse(e.postData.contents);
     MailApp.sendEmail("your-email@domain.com", "Contact: " + data.subject,
       "Name: " + data.name + "\nEmail: " + data.email + "\nMessage: " + data.message
     );
     return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
2. Deploy as Web App (Access: **Anyone**).
3. Set environment variable in Cloudflare Pages Dashboard:
   - `CONTACT_FORM_WEBHOOK_URL` = `https://script.google.com/macros/s/.../exec`

---

## 7. Firebase Push Notifications Setup

Push notification UI component (`src/components/PushNotification.astro`) and Service Worker (`public/firebase-messaging-sw.js`):

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add Web App and copy `firebaseConfig` and `vapidKey`.
3. Replace dummy keys in `public/firebase-messaging-sw.js` and `src/components/PushNotification.astro`.

---

## 8. Google AdSense Integration

Configure AdSense in `src/config/site.ts`:

```typescript
googleAdsenseId: "",         // Set your client ID (e.g. ca-pub-0000000000000000) or leave ""
adsenseLazyLoad: false,     // Set true to lazy-load AdSense
showAdPlaceholders: true,   // Set to false to hide ad placeholder boxes when googleAdsenseId is empty
```

Use the reusable `<AdSense />` component in layout templates:

```astro
---
import AdSense from "../components/AdSense.astro";
---

<AdSense slot="1234567890" format="auto" responsive="true" />
```

---

## 9. Web Stories Architecture & Working Mechanism

The platform includes full support for AMP & interactive Web Stories located under `src/pages/webstories/`.

### Working Mechanism
- **Data Source**: At build-time, pages fetch story items from `public/webstories/story-list.json` or external endpoints.
- **Fallback Engine**: If no JSON feed is available, built-in fallback stories ensure pages build cleanly without error.
- **Categorization**: Web stories are dynamically grouped by category slug (`/webstories/[category]/`).

### Disabling Web Stories Completely (`enableWebStories`)

If your website does not use Web Stories, you can disable them cleanly from `src/config/site.ts`:

```typescript
enableWebStories: false, // Set to false to disable Web Stories completely
```

When set to `false`:
1. **Header Navigation**: The `"WEBSTORIES"` link is automatically hidden from the main navigation header menu.
2. **Build-Time Skipping**: Astro skips generating `/webstories/` HTML files and returns 0 paths in `getStaticPaths()`. No unused Web Stories code or pages are built.
3. **XML Sitemap Exclusion**: `/webstories/` URLs are automatically excluded from `sitemap-index.xml.js`.
4. **404 Guard**: Direct access to `/webstories/` routes redirects automatically to 404.
