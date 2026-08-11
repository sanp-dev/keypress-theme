// src/utils/ga4-popular-posts.mjs
// Build-time utility: reads blog markdown files, writes two JSON files:
//   public/popular-posts-fallback.json  — always generated (top 30 recent posts)
//   public/popular-posts-ga4.json       — generated if GA4 credentials set
//
// GA4 credentials (optional) via environment variables:
//   GA4_PROPERTY_ID   - e.g. "123456789"
//   GA4_CLIENT_EMAIL  - Service account email
//   GA4_PRIVATE_KEY   - Service account private key (-----BEGIN PRIVATE KEY-----)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign } from 'node:crypto';

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

/**
 * Entry point called from astro.config.mjs build hook.
 * @param {string} publicDir - Absolute path to the public/ directory
 */
export async function generatePopularPostsFiles(publicDir) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const blogDir = path.join(__dirname, '..', 'content', 'blog');

  // Load local .env file if running locally (Cloudflare has actual process.env set)
  await loadEnvFile(path.join(__dirname, '..', '..', '.env'));

  // ─── Read all blog markdown files and extract frontmatter ─────────────────
  const allPosts = await readBlogPosts(blogDir);

  // ─── Write posts-metadata.json (comprehensive metadata lookup index) ──────
  await writePostsMetadataJson(publicDir, allPosts);

  // ─── Generate popular-posts-ga4.json (always generated) ───────────────────
  let ga4PostsWritten = false;

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;

  if (propertyId && clientEmail && privateKey) {
    try {
      console.log('[ga4-popular-posts] Fetching popular posts from GA4...');
      const accessToken = await getAccessToken(clientEmail, privateKey);
      const topPaths = await fetchTopPaths(accessToken, propertyId);
      const matched = matchPathsToPosts(topPaths, allPosts);

      if (matched && matched.length >= 3) {
        const outputPath = path.join(publicDir, 'popular-posts-ga4.json');
        // Limit to top 7 posts
        const limitedMatched = matched.slice(0, 7);
        await fs.writeFile(outputPath, JSON.stringify(limitedMatched, null, 2), 'utf-8');
        console.log(`[ga4-popular-posts] ✓ Wrote ${limitedMatched.length} posts from GA4 to popular-posts-ga4.json`);
        ga4PostsWritten = true;
      } else {
        console.log('[ga4-popular-posts] GA4 returned insufficient posts (< 3). Falling back to recent posts.');
      }
    } catch (err) {
      console.warn('[ga4-popular-posts] GA4 fetch failed:', err.message);
    }
  } else {
    console.log('[ga4-popular-posts] GA4 credentials not set — using recent posts for fallback.');
  }

  // If GA4 fetch failed or wasn't configured, write recent posts fallback to popular-posts-ga4.json
  if (!ga4PostsWritten) {
    const sorted = [...allPosts].sort(
      (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
    );
    const fallbackRecent = sorted.slice(0, 7).map(post => ({
      id: post.id,
      title: post.title,
      category: post.category,
      pubDate: post.pubDate.toISOString(),
      image: post.image,
      url: post.url,
    }));
    const outputPath = path.join(publicDir, 'popular-posts-ga4.json');
    await fs.writeFile(outputPath, JSON.stringify(fallbackRecent, null, 2), 'utf-8');
    console.log(`[ga4-popular-posts] ✓ Wrote ${fallbackRecent.length} recent posts fallback to popular-posts-ga4.json`);
  }
}

// ─── Read blog markdown files ─────────────────────────────────────────────────

async function readBlogPosts(blogDir) {
  const files = await fs.readdir(blogDir);
  const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  const posts = [];

  for (const file of mdFiles) {
    try {
      const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
      const frontmatter = parseFrontmatter(content);
      if (!frontmatter || !frontmatter.title) continue;

      // Post id = filename without extension (matches Astro's glob loader)
      const id = file.replace(/\.(md|mdx)$/, '');

      posts.push({
        id,
        title: frontmatter.title || '',
        category: frontmatter.category || '',
        pubDate: frontmatter.pubDate ? new Date(frontmatter.pubDate) : new Date(0),
        image: frontmatter.image || '',
        url: `/post/${id}/`,
      });
    } catch (err) {
      console.warn(`[ga4-popular-posts] Could not parse ${file}:`, err.message);
    }
  }

  return posts;
}

/**
 * Simple YAML frontmatter parser (handles --- delimited blocks).
 * Only extracts string, date, and basic fields — no need for a full YAML parser.
 */
function parseFrontmatter(content) {
  const cleanContent = content.replace(/^\uFEFF/, '');
  const match = cleanContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};

  for (const line of yaml.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

// ─── Write posts-metadata JSON ────────────────────────────────────────────────

async function writePostsMetadataJson(publicDir, allPosts) {
  const sorted = [...allPosts].sort(
    (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
  );

  const postsMetadata = sorted.map(post => ({
    id: post.id,
    title: post.title,
    category: post.category,
    pubDate: post.pubDate.toISOString(),
    image: post.image,
    url: post.url,
  }));

  const outputPath = path.join(publicDir, 'posts-metadata.json');
  await fs.writeFile(outputPath, JSON.stringify(postsMetadata, null, 2), 'utf-8');
  console.log(`[ga4-popular-posts] ✓ Wrote ${postsMetadata.length} posts to posts-metadata.json`);
}

// ─── GA4 Auth: JWT → Access Token ────────────────────────────────────────────

async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  // Build JWT header and payload (URL-safe base64, no padding)
  const toBase64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const header = toBase64url({ alg: 'RS256', typ: 'JWT' });
  const payload = toBase64url({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  });

  const unsignedJwt = `${header}.${payload}`;

  // Sign with RS256 using Node.js crypto
  const sign = createSign('RSA-SHA256');
  sign.update(unsignedJwt);

  // Fix escaped newlines in private key (common in .env vars)
  const fixedKey = privateKey.replace(/\\n/g, '\n');
  const signature = sign.sign(fixedKey, 'base64url');

  const jwt = `${unsignedJwt}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`GA4 auth failed: ${err}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// ─── GA4 Data API: Fetch top page paths ──────────────────────────────────────

async function fetchTopPaths(accessToken, propertyId) {
  const body = {
    dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'BEGINS_WITH', value: '/post/' },
      },
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  };

  const response = await fetch(
    `${GA4_API_BASE}/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();
  return (data.rows || []).map(row => ({
    path: row.dimensionValues[0].value,
    views: parseInt(row.metricValues[0].value, 10),
  }));
}

// ─── Match GA4 paths to parsed posts ─────────────────────────────────────────

function matchPathsToPosts(topPaths, allPosts) {
  const results = [];

  for (const { path: pagePath, views } of topPaths) {
    const match = pagePath.match(/^\/post\/(.+?)\/?$/);
    if (!match) continue;

    const postId = match[1];
    const post = allPosts.find(p => p.id === postId);
    if (!post) continue;

    results.push({
      id: post.id,
      title: post.title,
      category: post.category,
      pubDate: post.pubDate.toISOString(),
      image: post.image,
      url: post.url,
      views,
    });
  }

  return results;
}

// Helper to manually parse and load .env file into process.env locally
async function loadEnvFile(envPath) {
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIdx = trimmed.indexOf('=');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      // Remove surrounding single or double quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    // Gracefully ignore (expected in cloud/production environment where actual env exists)
  }
}

