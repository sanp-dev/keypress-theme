// Cloudflare Pages Edge Middleware Template
// Use this middleware to handle 410 Gone responses for permanently removed pages or custom request routing.

// ─── 410 Gone URLs List ───────────────────────────────────────────────────
// Add any permanently deleted post or page paths below (e.g. "/old-sample-deleted-post-slug/").
// Visiting these paths will return a 410 Gone HTTP status to users and search engines.
const GONE_PATHS = new Set([
  "/old-sample-deleted-post-slug/",
  "/example-removed-page/"
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.toLowerCase();

  // Skip static assets and files (images, css, js, webp, fonts, etc.) to minimize overhead
  if (path.includes('.') && !path.endsWith('.html')) {
    return context.next();
  }

  // Handle exact match deleted posts/pages
  const cleanPath = path.replace(/\/+$/, ''); // Normalize trailing slash
  if (
    GONE_PATHS.has(cleanPath) ||
    GONE_PATHS.has(cleanPath + '/') ||
    GONE_PATHS.has(cleanPath + '.html')
  ) {
    return returnGoneResponse();
  }

  return context.next();
}

function returnGoneResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>410 Gone - Page Permanently Removed</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f9fc;
      color: #3c4043;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05);
      max-width: 500px;
      text-align: center;
      border-top: 4px solid #d93025;
    }
    h1 {
      font-size: 24px;
      color: #202124;
      margin-top: 0;
      font-weight: 500;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #5f6368;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #1a73e8;
      color: white;
      text-decoration: none;
      padding: 10px 24px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    a:hover {
      background-color: #1557b0;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>410 Gone</h1>
    <p>This content has been permanently removed from our website. You can search for other articles on our homepage.</p>
    <a href="/">Go to Homepage</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    statusText: 'Gone',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=604800',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}
