// src/config/site.ts

export interface LogoLetter {
  char: string;
  color: string; // Tailwind color class, e.g. 'text-[#1a73e8]' or custom color
}

export interface SiteConfig {
  name: string;
  domain: string;
  cdnDomain: string;       // External CDN hostname for images (leave "" if images are in /public)
  contactEmail: string;    // Contact email displayed across legal & contact pages
  title: string;
  description: string;
  defaultOgImage: string;
  themeColor: string;
  logoLetters: LogoLetter[];
  logoTextSuffix: string;
  googleAdsenseId?: string; // Optional Google AdSense client ID (e.g. ca-pub-XXXXXXXXXXXXXXXX)
  adsenseLazyLoad?: boolean; // If true, AdSense script loads on first user interaction (or 300ms fallback)
  showAdPlaceholders?: boolean; // If true, displays demo ad placeholders when googleAdsenseId is empty
  enableWebStories?: boolean; // Set to false to completely disable Web Stories navigation, routes & builds
  turnstileSiteKey?: string;  // Optional Cloudflare Turnstile Site Key for contact form (e.g. 0x4AAAAAAAx...)
  showCookieConsent: boolean; // Control whether custom cookie consent banner is included in the build
  socials: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
    linkedin?: string;
    telegram?: string;
    github?: string;
  };
}

export const SITE_CONFIG: SiteConfig = {
  // ─── Basic Site Info ──────────────────────────────────────────────────────
  name: "Keypress Theme — Modern Web Publishing Platform",
  domain: "https://demo-blog.quicdecode.com",               // Production domain
  cdnDomain: "https://demo-cdn.quicdecode.com",            // External CDN domain for images
  contactEmail: "contact@quicdecode.com",                 // Shown on legal pages, contact page, and footer

  title: "Keypress Theme — Modern Web Publishing Platform",
  description: "A modern, fully functional web publishing platform built with Astro and Cloudflare Pages, designed for fast, scalable, and customizable websites.",
  defaultOgImage: "/default-og-image.jpg",            // Default social sharing image
  themeColor: "#1a73e8",                              // PWA / browser theme color

  // ─── Google AdSense Integration ───────────────────────────────────────────
  googleAdsenseId: "",         // Google AdSense client ID (placeholder)
  adsenseLazyLoad: false,                             // Set true to lazy-load AdSense
  showAdPlaceholders: true,                           // Set to false to hide ad placeholder boxes when googleAdsenseId is empty

  // ─── Cloudflare Turnstile Integration ──────────────────────────────────────
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "",        // Cloudflare Turnstile Site Key (leave "" for demo/unconfigured)

  // ─── Web Stories Configuration ─────────────────────────────────────────────
  enableWebStories: true,                             // Set to false to completely disable Web Stories routes & header link

  // ─── Cookie Consent Configuration ─────────────────────────────────────────
  showCookieConsent: false,                           // Set to false to completely exclude the custom cookie banner from the build

  // ─── Branding: Logo Letters ───────────────────────────────────────────────────────────
  logoLetters: [
    { char: "K", color: "text-[#1a73e8]" },
    { char: "P", color: "text-[#d93025]" },
  ],
  logoTextSuffix: "Keypress",

  // ─── Social Media Links ───────────────────────────────────────────────────
  socials: {
    youtube: "#",
    instagram: "#",
    twitter: "#",
    facebook: "#",
    linkedin: "#",
    telegram: "#",
    github: "https://github.com/sanp-dev",
  }
};

export const ADS_SLOTS = {
  // ─── Responsive Auto Slots ────────────────────────────────────────────────────────
  horizontal: "1234567890", // KP HORIZONTAL AD   → Home top / Post top / Category
  square: "1234567891", // KP SQUARE AD        → Home bottom / Post bottom
  vertical: "1234567892", // KP VERTICAL AD      → Post Left Sidebar (160×600)
  vertical2: "1234567893", // KP VERTICAL AD 2    → Post Right Sidebar (160×600)

  // ─── Specialised Slots ───────────────────────────────────────────────────────────
  top: "1234567894", // kp-top              → Fixed 728×90 Leaderboard (reserved)
  inArticle1: "1234567895", // KP IN-ARTICLE #1    → In-article fluid (after 3rd para)
  inArticle2: "1234567896", // KP IN-ARTICLE #2    → In-article fluid (after 8th para)
};
