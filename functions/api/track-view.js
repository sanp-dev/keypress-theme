// functions/api/track-view.js
// Server-side view counter using Cloudflare KV.
// Called from post pages via fetch (non-blocking).
// KV binding required: POST_VIEWS (set in Cloudflare Pages dashboard)

export async function onRequestPost({ request, env }) {
  try {
    const kv = env.POST_VIEWS;

    // If KV binding is not configured, silently succeed (graceful degradation)
    if (!kv) {
      return new Response(JSON.stringify({ ok: true, reason: 'kv_not_configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Bot filtering: Ignore crawlers/automated spiders ---
    const userAgent = request.headers.get('User-Agent') || '';
    const isBot = /bot|crawler|spider|lighthouse|mediapartners|apis-google|google-structured-data|slurp|yandex|baidu|vkshare|facebookexternalhit|twitterbot|pinterest|slackbot|telegrambot|whatsapp|discordbot/i.test(userAgent);
    if (isBot) {
      return new Response(JSON.stringify({ ok: true, reason: 'bot_ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const postId = body?.postId;

    if (!postId || typeof postId !== 'string' || postId.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid postId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize postId to a safe KV key
    const safeId = postId.replace(/[^a-zA-Z0-9\-_/]/g, '_').slice(0, 200);

    // --- Rate limiting: Check Cookie (Zero KV operations) ---
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookieName = `v_${safeId}`;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const hasCookie = cookies.some(c => c.startsWith(`${cookieName}=`));

    if (hasCookie) {
      return new Response(JSON.stringify({ ok: true, reason: 'rate_limited' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Increment view count with Probabilistic Sampling (10x write reduction) ---
    const SAMPLE_RATE = 10;
    const isSampled = Math.random() < (1 / SAMPLE_RATE);
    let responseBody = { ok: true, sampled: false };

    if (isSampled) {
      const viewKey = `views:${safeId}`;
      const currentVal = await kv.get(viewKey);
      const currentViews = parseInt(currentVal || '0', 10);
      const newViews = currentViews + SAMPLE_RATE;

      // Store updated count (no expiration - permanent)
      await kv.put(viewKey, String(newViews));

      // 6-day rolling window view counter
      const todayStr = new Date().toISOString().split('T')[0];
      const dailyKey = `v6d:${todayStr}:${safeId}`;
      const currentDailyVal = await kv.get(dailyKey);
      const currentDailyViews = parseInt(currentDailyVal || '0', 10);
      const newDailyViews = currentDailyViews + SAMPLE_RATE;
      // Set TTL to 7 days (604,800 seconds) so old days automatically delete
      await kv.put(dailyKey, String(newDailyViews), { expirationTtl: 604800 });

      responseBody = { ok: true, views: newViews, sampled: true };
    }

    // Set cookie on response (expires in 24 hours) to prevent double counting
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${cookieName}=1; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict; Secure`,
      },
    });
  } catch (err) {
    // Never crash the user experience
    console.error('[track-view] Error:', err);
    return new Response(JSON.stringify({ ok: true, reason: 'error_ignored' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
