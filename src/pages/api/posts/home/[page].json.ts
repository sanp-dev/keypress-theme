// src/pages/api/posts/home/[page].json.ts
//
// Pre-generates one static JSON file per page of home posts at build time:
//   /api/posts/home/2.json   → posts 7–12
//   /api/posts/home/3.json   → posts 13–18   … etc.
//
// Page 1 is always rendered inline as static HTML in index.astro, so we
// start generating JSON from page 2 onward.

import type { APIRoute, GetStaticPaths } from 'astro';
import {
  getSortedPosts,
  getSerializablePage,
  totalPages,
  POSTS_PER_PAGE,
} from '../../../../utils/posts-api';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getSortedPosts();
  const pages = totalPages(posts);

  // Generate paths for pages 2, 3, 4 … N
  // (page 1 = inline HTML — no JSON file needed)
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({
    params: { page: String(i + 2) },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const pageNumber = Number(params.page);
  const posts = await getSortedPosts();
  const pageData = await getSerializablePage(posts, pageNumber);
  const hasMore = pageNumber * POSTS_PER_PAGE < posts.length;

  return new Response(
    JSON.stringify({ posts: pageData, hasMore }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Static file — Cloudflare Pages CDN caches aggressively; revalidate on redeploy
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
};

