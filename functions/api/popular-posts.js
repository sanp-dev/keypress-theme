// functions/api/popular-posts.js
// Returns top popular posts using 2-tier fallback:
//   Tier 1: Cloudflare KV view counts (real-time, server-side, cookie-proof, enriched via posts-metadata.json)
//   Tier 2: GA4/Recent fallback JSON (pre-generated at /popular-posts-ga4.json)
// KV binding required: POST_VIEWS (set in Cloudflare Pages dashboard)

const POPULAR_COUNT = 7;
const CACHE_TTL = 300; // 5 minutes cache

export async function onRequestGet({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${CACHE_TTL}, stale-while-revalidate=60`,
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // ─── Tier 1: Cloudflare KV ──────────────────────────────────────────────
    const kv = env.POST_VIEWS;
    const origin = new URL(request.url).origin;

    if (kv) {
      const result = await getFromKV(kv, POPULAR_COUNT, origin);
      if (result && result.length >= 3) {
        return new Response(
          JSON.stringify({ posts: result, source: 'kv' }),
          { status: 200, headers }
        );
      }
    }

    // ─── Tier 2: GA4/Recent Build-time JSON ──────────────────────────────────
    // This file is generated at build time by src/utils/ga4-popular-posts.mjs
    const ga4Response = await fetch(`${origin}/popular-posts-ga4.json`).catch(() => null);

    if (ga4Response && ga4Response.ok) {
      const ga4Data = await ga4Response.json().catch(() => null);
      if (Array.isArray(ga4Data) && ga4Data.length > 0) {
        return new Response(
          JSON.stringify({ posts: ga4Data.slice(0, POPULAR_COUNT), source: 'ga4' }),
          { status: 200, headers }
        );
      }
    }

    // Ultimate fallback: empty array (section will hide itself)
    return new Response(
      JSON.stringify({ posts: [], source: 'empty' }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error('[popular-posts] Error:', err);
    return new Response(
      JSON.stringify({ posts: [], source: 'error' }),
      { status: 200, headers }
    );
  }
}

/**
 * Reads all view:* keys from KV, sorts by count, fetches post metadata
 * from posts-metadata.json, and returns the top N posts with their data.
 */
async function getFromKV(kv, count, origin) {
  try {
    // List all v6d keys (max 1000 - more than enough)
    const listResult = await kv.list({ prefix: 'v6d:' });

    if (!listResult || !listResult.keys || listResult.keys.length === 0) {
      // Fallback: if no 6d keys yet, use the old permanent views prefix
      const oldList = await kv.list({ prefix: 'views:' });
      if (!oldList || !oldList.keys || oldList.keys.length === 0) {
        return null;
      }
      
      const viewPromises = oldList.keys.map(async (key) => {
        const val = await kv.get(key.name);
        const postId = key.name.replace('views:', '');
        return { postId, views: parseInt(val || '0', 10) };
      });
      const viewData = await Promise.all(viewPromises);
      const topPosts = viewData
        .filter(p => p.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, count);
      return await enrichPosts(topPosts, origin);
    }

    // We have v6d keys! Let's aggregate views by postId
    const now = new Date();
    // Get date string threshold for 6 days ago (so 6 days including today)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(now.getDate() - 6);
    const sixDaysAgoStr = sixDaysAgo.toISOString().split('T')[0];

    const viewPromises = listResult.keys.map(async (key) => {
      // Key format: v6d:YYYY-MM-DD:safeId
      const parts = key.name.split(':');
      if (parts.length < 3) return null;
      const dateStr = parts[1];
      const postId = parts.slice(2).join(':');

      // Filter: only sum if within the last 6 days
      if (dateStr >= sixDaysAgoStr) {
        const val = await kv.get(key.name);
        return { postId, views: parseInt(val || '0', 10) };
      }
      return null;
    });

    const results = await Promise.all(viewPromises);
    
    // Aggregate by postId
    const aggregated = {};
    for (const item of results) {
      if (item && item.views > 0) {
        if (!aggregated[item.postId]) {
          aggregated[item.postId] = 0;
        }
        aggregated[item.postId] += item.views;
      }
    }

    // Convert to array and sort
    const topPosts = Object.entries(aggregated)
      .map(([postId, views]) => ({ postId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, count);

    if (topPosts.length < 3) return null;

    return await enrichPosts(topPosts, origin);
  } catch (err) {
    console.error('[popular-posts] KV read error:', err);
    return null;
  }
}

async function enrichPosts(topPosts, origin) {
  // Fetch posts-metadata.json to enrich KV posts
  const metaResponse = await fetch(`${origin}/posts-metadata.json`).catch(() => null);
  if (metaResponse && metaResponse.ok) {
    const allPosts = await metaResponse.json().catch(() => null);
    if (Array.isArray(allPosts)) {
      const postMap = Object.fromEntries(allPosts.map(p => [p.id, p]));
      return topPosts
        .map(p => {
          const meta = postMap[p.postId];
          if (!meta) return null;
          return {
            ...meta,
            views: p.views
          };
        })
        .filter(p => p !== null && p.title);
    }
  }

  // If metadata fetch failed, return raw KV ids
  return topPosts.map(p => ({
    id: p.postId,
    views: p.views,
  }));
}
