// src/pages/api/posts/label/[tag]/[page].json.ts
//
// Pre-generates static JSON per page per tag at build time:
//   /api/posts/label/health-tips/2.json  → health-tips posts 7–12
//
// Page 1 (hero + first 6) is rendered as HTML in label/[tag].astro.

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import {
  getSerializablePage,
  totalPages,
  POSTS_PER_PAGE,
} from '../../../../../utils/posts-api';

function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog');

  // Only primary tag (index 0) gets its own label page
  const bySlug = new Map<string, typeof allPosts>();
  for (const post of allPosts) {
    const primaryTag = post.data.tags?.[0];
    if (!primaryTag) continue;
    const slug = tagToSlug(primaryTag);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(post);
  }

  const paths: { params: { tag: string; page: string } }[] = [];

  for (const [slug, posts] of bySlug.entries()) {
    const sorted = posts.sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );
    const remaining = sorted.slice(1); // index 0 = hero
    const pages = totalPages(remaining);

    for (let p = 2; p <= pages; p++) {
      paths.push({ params: { tag: slug, page: String(p) } });
    }
  }

  return paths;
};

export const GET: APIRoute = async ({ params }) => {
  const { tag, page: pageStr } = params;
  const pageNumber = Number(pageStr);
  const allPosts = await getCollection('blog');

  const tagPosts = allPosts
    .filter((p) => {
      const primaryTag = p.data.tags?.[0];
      return primaryTag && tagToSlug(primaryTag) === tag;
    })
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const remaining = tagPosts.slice(1);
  const pageData = await getSerializablePage(remaining, pageNumber);
  const hasMore = pageNumber * POSTS_PER_PAGE < remaining.length;

  return new Response(
    JSON.stringify({ posts: pageData, hasMore }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
};

