import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../config/site';

function escapeXml(unsafeStr) {
  return unsafeStr.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function GET(context) {
  const allPosts = await getCollection('blog');
  const siteUrl = context.site?.href || SITE_CONFIG.domain;
  const baseUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;

  // 1. Static Pages
  const staticPaths = [
    '',
    'about/',
    'contact/',
    'privacy-policy/',
    'terms-and-conditions/',
    'disclaimer/',
    'sitemap/',
    ...(SITE_CONFIG.enableWebStories !== false ? ['webstories/'] : [])
  ];

  // 2. Categories
  const categories = [...new Set(allPosts.map((post) => post.data.category))].filter(Boolean);
  const categoryPaths = categories.map((cat) => `category/${slugify(cat)}/`);

  // 3. Tags (primary tags)
  const primaryTags = allPosts.map((post) => post.data.tags?.[0]).filter(Boolean);
  const uniqueTags = [...new Set(primaryTags)];
  const tagPaths = uniqueTags.map((tag) => `label/${slugify(tag)}/`);

  // 4. Authors
  const authorSlugs = new Set();
  allPosts.forEach((post) => {
    const slug = post.data.authorSlug || slugify(post.data.author || '');
    if (slug) authorSlugs.add(slug);
  });
  const authorPaths = Array.from(authorSlugs).map((slug) => `author/${slug}/`);

  // Combine all paths
  const allPaths = [
    ...staticPaths,
    ...categoryPaths,
    ...tagPaths,
    ...authorPaths
  ];

  // Construct XML
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPaths.map((path) => {
    const url = new URL(path, baseUrl).href;
    return `
  <url>
    <loc>${escapeXml(url)}</loc>
  </url>`;
  }).join('')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
