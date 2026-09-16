// src/utils/posts-api.ts
//
// Shared build-time utility: converts raw Astro content collection posts into
// serializable, pre-optimised page chunks for the static JSON "Load More" API.
//
// getImage() is always wrapped in try/catch — a single bad remote URL will
// NEVER crash the build; it falls back to the original (or default) URL.

import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import { cleanImageUrl } from './image';

export const POSTS_PER_PAGE = 6;

// ── Serialisable post shape delivered to the client ──────────────────────────
export interface SerializablePost {
  id: string;
  title: string;
  description: string;
  category: string;
  /** ISO-8601 string — safe to pass through JSON */
  pubDate: string;
  /** Optimised 1× WebP src (or fallback raw URL) */
  image1x: string;
  /** Optimised 2× WebP src (or fallback raw URL) */
  image2x: string;
}

// ── Single post → serialisable shape ─────────────────────────────────────────
async function toSerializable(
  post: CollectionEntry<'blog'>
): Promise<SerializablePost> {
  let image1x = '';
  let image2x = '';

  if (post.data.image) {
    const cleaned = cleanImageUrl(post.data.image);
    try {
      const [opt1x, opt2x] = await Promise.all([
        getImage({ src: cleaned, width: 120, height: 78, quality: 75, format: 'webp' }),
        getImage({ src: cleaned, width: 240, height: 156, quality: 75, format: 'webp' }),
      ]);
      image1x = opt1x.src;
      image2x = opt2x.src;
    } catch {
      // Defensive fallback — image processing failed but build must not crash
      image1x = cleaned;
      image2x = cleaned;
    }
  }

  return {
    id: post.id,
    title: post.data.title,
    description: post.data.description ?? '',
    category: post.data.category,
    pubDate: post.data.pubDate.toISOString(),
    image1x,
    image2x,
  };
}

// ── All blog posts, sorted newest-first ──────────────────────────────────────
export async function getSortedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const all = await getCollection('blog');
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

// ── One page of serialisable posts from a pre-sorted array ───────────────────
// pageNumber is 1-indexed; page 1 = posts 0–5 (rendered as HTML on the page),
// page 2 = posts 6–11, page 3 = posts 12–17, etc.
export async function getSerializablePage(
  posts: CollectionEntry<'blog'>[],
  pageNumber: number
): Promise<SerializablePost[]> {
  const start = (pageNumber - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const slice = posts.slice(start, end);
  return Promise.all(slice.map(toSerializable));
}

// ── Total page count for a given post array ───────────────────────────────────
export function totalPages(posts: CollectionEntry<'blog'>[]): number {
  return Math.ceil(posts.length / POSTS_PER_PAGE);
}

