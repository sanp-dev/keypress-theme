// functions/api/contact.js

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    // 1. Honeypot check (anti-bot)
    // If the invisible 'website' field is filled, reject the request immediately as spam.
    if (data.website && data.website.trim() !== '') {
      return new Response(JSON.stringify({ error: "Spam detected." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Cloudflare Turnstile verification
    const turnstileToken = data.turnstileToken;
    const secretKey = env.TURNSTILE_SECRET_KEY;

    if (!turnstileToken && secretKey) {
      return new Response(JSON.stringify({ error: "Security check is missing. Please complete the captcha." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (secretKey) {
      const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(turnstileToken)}`
      });

      const verifyResult = await verifyResponse.json();
      if (!verifyResult.success) {
        return new Response(JSON.stringify({ error: "Captcha verification failed. Please refresh the page and try again." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      console.info("[Contact API] TURNSTILE_SECRET_KEY is not set in Cloudflare environment variables. Bypassing server verification in unconfigured mode.");
    }

    // 3. Extract and Clean Inputs
    const rawName = data.name ? data.name.trim() : '';
    const rawEmail = data.email ? data.email.trim().toLowerCase() : '';
    const rawSubject = data.subject ? data.subject.trim() : '';
    const rawMessage = data.message ? data.message.trim() : '';

    // HTML stripping helper to prevent XSS script injection
    const sanitize = (str) => str.replace(/<[^>]*>/g, '').trim();

    const name = sanitize(rawName);
    const email = sanitize(rawEmail);
    const subject = sanitize(rawSubject);
    const message = sanitize(rawMessage);

    // 4. Server-side validation rules
    // Name validation
    if (name.length < 2 || name.length > 50) {
      return new Response(JSON.stringify({ error: "Name must be between 2 and 50 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Email validation
    if (email.length < 5 || email.length > 100) {
      return new Response(JSON.stringify({ error: "Email must be between 5 and 100 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address format." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Block Disposable Domains
    const blockedDomains = ['mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'trashmail.com'];
    const emailDomain = email.split('@')[1];
    if (blockedDomains.includes(emailDomain)) {
      return new Response(JSON.stringify({ error: "Temporary or disposable email addresses are not allowed." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Subject validation
    if (subject.length < 3 || subject.length > 100) {
      return new Response(JSON.stringify({ error: "Subject must be between 3 and 100 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Message validation
    if (message.length < 10 || message.length > 1000) {
      return new Response(JSON.stringify({ error: "Message must be between 10 and 1000 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Webhook URL read securely from Cloudflare Environment Variables
    const googleScriptUrl = env.CONTACT_FORM_WEBHOOK_URL;

    if (!googleScriptUrl) {
      console.info("[Contact API] CONTACT_FORM_WEBHOOK_URL is not configured in Cloudflare environment variables.");
      return new Response(JSON.stringify({ success: "Thank you! Your message has been received in demo mode." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const forwardResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
      redirect: "follow"
    });

    // Google Apps Script may return plain text or redirect — parse safely
    const rawText = await forwardResponse.text();
    let forwardResult = {};
    try {
      forwardResult = JSON.parse(rawText);
    } catch (_) {
      // Not JSON — treat any 2xx HTTP status as success
      forwardResult = { status: forwardResponse.ok ? "success" : "error" };
    }

    if (forwardResponse.ok && forwardResult.status !== "error") {
      return new Response(JSON.stringify({ success: "Thank you! Your message has been sent successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      throw new Error(forwardResult.message || "Message delivery failed.");
    }

  } catch (error) {
    console.error("Contact API Error Details:", error);
    return new Response(JSON.stringify({ error: "An error occurred while sending your message. Please try again later." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
