// src/pages/api/posts/category/[slug]/[page].json.ts
//
// Pre-generates one static JSON file per page per category at build time:
//   /api/posts/category/health/2.json   → health posts 7–12
//   /api/posts/category/tech/2.json     → tech posts 7–12   … etc.
//
// Page 1 posts (hero + first 6) are rendered as static HTML in
// category/[name].astro — no JSON file needed for page 1.

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import {
  getSerializablePage,
  totalPages,
  POSTS_PER_PAGE,
} from '../../../../../utils/posts-api';

// Build the category slug the same way [name].astro does
function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog');

  // Group posts by category slug → sorted newest-first
  const bySlug = new Map<string, typeof allPosts>();
  for (const post of allPosts) {
    const slug = categoryToSlug(post.data.category);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(post);
  }

  const paths: { params: { slug: string; page: string } }[] = [];

  for (const [slug, posts] of bySlug.entries()) {
    const sorted = posts.sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );
    // Category page shows: hero post (1) + up to 6 in the grid = effectively
    // "remaining posts" (sorted[1..]) are paginated.
    // remainingPosts = sorted.slice(1)
    // pages 2..N of remainingPosts are pre-generated here.
    const remaining = sorted.slice(1);
    const pages = totalPages(remaining);

    for (let p = 2; p <= pages; p++) {
      paths.push({ params: { slug, page: String(p) } });
    }
  }

  return paths;
};

export const GET: APIRoute = async ({ params }) => {
  const { slug, page: pageStr } = params;
  const pageNumber = Number(pageStr);
  const allPosts = await getCollection('blog');

  // Re-build the same "remaining posts" slice used by the category page
  const categoryPosts = allPosts
    .filter(p => categoryToSlug(p.data.category) === slug)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const remaining = categoryPosts.slice(1); // exclude hero post
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

