// src/pages/api/posts/author/[slug]/[page].json.ts
//
// Pre-generates static JSON per page per author slug at build time:
//   /api/posts/author/priya-sharma/2.json  → author's posts 4–6 (after initial 3)
//
// Author page shows first 3 posts inline (visible), then shows/hides them
// with CSS. For large author post counts, pages 2+ are pre-generated here.

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import {
  getSerializablePage,
  totalPages,
  POSTS_PER_PAGE,
} from '../../../../../utils/posts-api';

function authorToSlug(author: string): string {
  return author
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog');

  const bySlug = new Map<string, typeof allPosts>();
  for (const post of allPosts) {
    const slug = post.data.authorSlug || authorToSlug(post.data.author);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(post);
  }

  const paths: { params: { slug: string; page: string } }[] = [];

  for (const [slug, posts] of bySlug.entries()) {
    const sorted = posts.sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );
    const pages = totalPages(sorted);

    // Generate from page 2 (page 1 = first POSTS_PER_PAGE rendered as HTML)
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

  const authorPosts = allPosts
    .filter((p) => (p.data.authorSlug || authorToSlug(p.data.author)) === slug)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const pageData = await getSerializablePage(authorPosts, pageNumber);
  const hasMore = pageNumber * POSTS_PER_PAGE < authorPosts.length;

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

