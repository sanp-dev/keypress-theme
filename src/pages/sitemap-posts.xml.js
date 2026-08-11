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

export async function GET(context) {
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const siteUrl = context.site?.href || SITE_CONFIG.domain;

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${sortedPosts.map(post => {
    
    const postUrl = new URL(`/post/${post.id}/`, siteUrl).href;
    const lastMod = new Date(post.data.pubDate).toISOString();
    const imageUrl = new URL(post.data.image, siteUrl).href;
    const imageTitle = post.data.title;

    return `
  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title><![CDATA[${imageTitle}]]></image:title>
    </image:image>
  </url>`;
  }).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}