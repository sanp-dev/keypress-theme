// src/pages/rss.xml.js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../config/site';

export async function GET(context) {
  const blog = await getCollection('blog');

  const sortedPosts = blog.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const siteUrl = context.site?.href || SITE_CONFIG.domain;

  const selfUrl = siteUrl.endsWith('/') ? `${siteUrl}rss.xml` : `${siteUrl}/rss.xml`;

  return rss({
    title: SITE_CONFIG.title.trim(),
    description: SITE_CONFIG.description,
    site: siteUrl,

    xmlns: { 
      media: 'http://search.yahoo.com/mrss/',
      atom: 'http://www.w3.org/2005/Atom'
    },

    items: sortedPosts.map((post) => {
      const imageUrl = new URL(post.data.image, siteUrl).href;

      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description || 'Read the full story on our blog.',
        link: `/post/${post.id}/`,
        customData: `<media:content url="${imageUrl}" medium="image" />`,
      };
    }),

    customData: `<language>en-us</language><atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />`,
  });
}