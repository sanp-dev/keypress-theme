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
    github: "https://github.com/SandhataPrajapati",
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
- `LICENSE_KEY`: Optional license key string for evaluation mode.

---

## 4. Cloudflare D1 Database & KV Setup

The platform uses Cloudflare bindings configured in `wrangler.toml`:

```toml
name = "demo-blog"
compatibility_date = "2026-08-10"

# D1 Database for Email Subscriptions
[[d1_databases]]
binding = "DB"
database_name = "demo-blog-db"
database_id = "f460a0e9-0dc4-418a-89c3-70abd57b2070"

# KV Namespace for Page View Tracking & Popular Posts
[[kv_namespaces]]
binding = "POST_VIEWS"
id = "2c815d1dfe2a4228b0271204db3d43d5"
```

### Creating D1 & KV via Wrangler CLI

If deploying a new instance:

```bash
# Create D1 database for email subscribers
npx wrangler d1 create my-blog-db

# Create KV namespace for page view tracking
npx wrangler kv namespace create MY_BLOG_KV
```

Paste the generated IDs into your `wrangler.toml` file.

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
googleAdsenseId: "ca-pub-0000000000000000",
adsenseLazyLoad: false,
```

Use the reusable `<AdSense />` component in layout templates:

```astro
---
import AdSense from "../components/AdSense.astro";
---

<AdSense slot="1234567890" format="auto" responsive="true" />
```
