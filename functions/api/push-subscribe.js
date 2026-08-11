// functions/api/push-subscribe.js

/**
 * Handle POST request for registering push subscription (JSON payload)
 */
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const token = data.token ? data.token.trim() : '';

    if (!token || token.length < 10 || token.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid token length." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 1. Ensure the database table exists
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS push_subscribers (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "token TEXT UNIQUE NOT NULL, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    ).run();

    // 2. Insert or replace token (Upsert)
    const { success } = await env.DB.prepare(
      "INSERT OR REPLACE INTO push_subscribers (token) VALUES (?)"
    ).bind(token).run();

    if (success) {
      return new Response(JSON.stringify({ success: "Subscription stored successfully!" }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      throw new Error("Database insertion failed.");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

/**
 * Handle GET request for legacy push subscription (/api/push-subscribe?token=XYZ)
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token || token.length < 10 || token.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid or missing token parameter." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 1. Ensure the database table exists
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS push_subscribers (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "token TEXT UNIQUE NOT NULL, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    ).run();

    // 2. Insert or replace token (Upsert)
    const { success } = await env.DB.prepare(
      "INSERT OR REPLACE INTO push_subscribers (token) VALUES (?)"
    ).bind(token).run();

    if (success) {
      return new Response(JSON.stringify({ success: "Subscription stored successfully!" }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      throw new Error("Database insertion failed.");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

/**
 * Handle OPTIONS preflight requests for CORS compatibility
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
