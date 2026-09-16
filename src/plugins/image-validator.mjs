// src/plugins/image-validator.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function imageValidatorPlugin() {
  return {
    name: 'image-validator-plugin',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        logger.info('[image-validator] Starting validation of remote images...');

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const projectRoot = path.resolve(__dirname, '..', '..');
        const blogDir = path.join(projectRoot, 'src', 'content', 'blog');
        const outputPath = path.join(projectRoot, 'src', 'utils', 'invalid-images.json');

        // ── Scan Phase ──────────────────────────────────────────────────────────
        let files = [];
        try {
          files = await fs.readdir(blogDir);
        } catch (e) {
          logger.warn(`[image-validator] Could not read content directory: ${e.message}`);
          await fs.writeFile(outputPath, '[]', 'utf-8');
          return;
        }

        const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
        const remoteUrls = new Set();

        for (const file of mdFiles) {
          const filePath = path.join(blogDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          // Match frontmatter image field (quoted or unquoted)
          const match = content.match(/^image:\s*["']?([^"'\r\n]+)["']?/m);
          if (match && match[1]) {
            const url = match[1].trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
              remoteUrls.add(url);
            }
          }
        }

        logger.info(
          `[image-validator] Found ${remoteUrls.size} unique remote URLs. ` +
          `Starting 20-worker sliding-window validation...`
        );

        // ── Per-attempt HEAD request ─────────────────────────────────────────────
        const checkOnce = async (url, timeoutMs) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch(url, {
              method: 'HEAD',
              signal: controller.signal,
              headers: { 'User-Agent': 'Astro-Build-Validator' },
            });
            return { ok: res.ok, status: res.status };
          } finally {
            // Always clear — prevents timer leak even on throw/abort
            clearTimeout(timeoutId);
          }
        };

        // ── Retry wrapper (2 attempts, 500 ms backoff) ───────────────────────────
        const checkWithRetries = async (url, { attempts = 2, timeoutMs = 8000, retryDelayMs = 500 } = {}) => {
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const { ok, status } = await checkOnce(url, timeoutMs);

              // 2xx → unambiguously valid
              if (ok) return { invalid: false };

              // WAF / bot-protection challenge codes → treat as VALID.
              // These hosts block automated HEAD requests but serve images fine.
              if (status === 400 || status === 403 || status === 405) {
                return { invalid: false };
              }

              // Any other non-2xx (404, 410, 500 …) → mark as invalid immediately,
              // no point retrying a definitive HTTP error.
              logger.warn(`[image-validator] Dead URL (HTTP ${status}): ${url}`);
              return { invalid: true };

            } catch (e) {
              // Network-level error (AbortError = timeout, ENOTFOUND = DNS, etc.)
              if (attempt < attempts) {
                // Brief backoff before retry
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
              } else {
                // Final attempt failed — only treat as invalid in CI environments.
                // Local developers may be offline; don't force fallbacks on them.
                if (process.env.CI || process.env.CF_PAGES) {
                  logger.warn(`[image-validator] Network failure after ${attempts} attempts (CI): ${url} — ${e.message}`);
                  return { invalid: true };
                } else {
                  logger.warn(`[image-validator] Network failure (local, skipping): ${url} — ${e.message}`);
                  return { invalid: false };
                }
              }
            }
          }
          return { invalid: false };
        };

        // ── 20-Worker Sliding-Window Pool ────────────────────────────────────────
        // Each worker pulls the next unclaimed URL via a shared cursor.
        // A slow URL never blocks other workers — true sliding window.
        const invalidUrls = [];
        const urlArray = Array.from(remoteUrls);
        const MAX_CONCURRENT = 20;
        let cursor = 0;

        const worker = async () => {
          while (cursor < urlArray.length) {
            const url = urlArray[cursor++];
            const { invalid } = await checkWithRetries(url, {
              attempts: 2,
              timeoutMs: 8000,
              retryDelayMs: 500,
            });
            if (invalid) invalidUrls.push(url);
          }
        };

        const workerCount = Math.min(MAX_CONCURRENT, urlArray.length);
        if (workerCount > 0) {
          await Promise.all(Array.from({ length: workerCount }, () => worker()));
        }

        // ── Output ───────────────────────────────────────────────────────────────
        await fs.writeFile(outputPath, JSON.stringify(invalidUrls, null, 2), 'utf-8');
        logger.info(
          `[image-validator] Done. ${invalidUrls.length} dead / ${urlArray.length} total URLs checked.`
        );
      },
    },
  };
}
