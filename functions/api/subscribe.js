// functions/api/subscribe.js

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    // 1. Clean the email input (remove spaces and convert to lowercase)
    const email = data.email ? data.email.trim().toLowerCase() : '';

    // 2. Length Validation (Prevent excessively short or impossibly long emails)
    // Standard email maximum length is 254 characters. Minimum is typically 5 (e.g., a@b.c)
    if (email.length < 5 || email.length > 254) {
      return new Response(JSON.stringify({ error: "Please enter an email address with a valid length." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 3. Strict Regex Validation (Ensure proper format)
    const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!strictEmailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address format." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 4. Smart Validation: Block Disposable/Fake Email Domains
    const blockedDomains = ['mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'trashmail.com'];
    const domain = email.split('@')[1];
    if (blockedDomains.includes(domain)) {
      return new Response(JSON.stringify({ error: "Disposable or temporary email addresses are not allowed." }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 5. Ensure Database Binding exists
    if (!env || !env.DB) {
      console.error("D1 Database binding 'DB' is missing in environment settings.");
      return new Response(JSON.stringify({ error: "Database service unavailable. Please configure Cloudflare D1 DB binding." }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 6. Ensure the subscribers table exists in Cloudflare D1
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS subscribers (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "email TEXT UNIQUE NOT NULL, " +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
      ")"
    ).run();

    // 7. Insert into Cloudflare D1 Database
    const { success } = await env.DB.prepare(
      "INSERT INTO subscribers (email) VALUES (?)"
    ).bind(email).run();

    if (success) {
      return new Response(JSON.stringify({ success: "Thank you for subscribing to our newsletter!" }), {
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
    // 8. Handle Duplicate Email Error (UNIQUE constraint from SQL)
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("UNIQUE constraint failed") || errorMsg.includes("UNIQUE constraint")) {
      return new Response(JSON.stringify({ error: "This email is already subscribed!" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    console.error("Subscribe API Error:", error);

    // 9. Handle Other Server Errors
    return new Response(JSON.stringify({ error: errorMsg || "Internal server error. Please try again later." }), {
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}