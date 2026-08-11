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
        
        let files = [];
        try {
          files = await fs.readdir(blogDir);
        } catch (e) {
          logger.warn(`[image-validator] Could not read content directory: ${e.message}`);
          return;
        }
        
        const mdFiles = files.filter(f => f.endsWith('.md'));
        const remoteUrls = new Set();
        
        // Step 1: Scan files for remote image URLs
        for (const file of mdFiles) {
          const filePath = path.join(blogDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const match = content.match(/image:\s*["']?([^"'\r\n]+)["']?/);
          if (match && match[1]) {
            const url = match[1].trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
              remoteUrls.add(url);
            }
          }
        }
        
        logger.info(`[image-validator] Found ${remoteUrls.size} unique remote URLs. Checking network availability...`);
        
        const invalidUrls = [];
        
        // Step 2: Validate remote URLs in parallel (using a HEAD request for speed and minimal data transfer)
        await Promise.all(Array.from(remoteUrls).map(async (url) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
            
            const res = await fetch(url, { 
              method: 'HEAD', 
              signal: controller.signal,
              headers: { 'User-Agent': 'Astro-Build-Validator' }
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
              // Ignore 403 (Forbidden/Bot Protection) and 405 (Method Not Allowed)
              // as the image is likely valid but blocking our script's HEAD request.
              if (res.status !== 403 && res.status !== 405 && res.status !== 400) {
                logger.warn(`[image-validator] Image URL is offline/invalid (Status ${res.status}): ${url}`);
                invalidUrls.push(url);
              }
            }
          } catch (e) {
            // Only add to invalid list if it's an actual network failure on production.
            // On local builds, if developer is offline, we want to warn but not force fallback.
            // In this case, we check if it is aborted (timeout) or has actual offline codes.
            logger.warn(`[image-validator] Image URL check failed (Network Offline/Timeout): ${url} - Error: ${e.message}`);
            
            // On production builds (typically CI environment), we treat network failures as invalid.
            // We can detect CI environment via process.env.CI or process.env.CF_PAGES.
            if (process.env.CI || process.env.CF_PAGES) {
              invalidUrls.push(url);
            }
          }
        }));
        
        // Step 3: Write invalid URLs list
        await fs.writeFile(outputPath, JSON.stringify(invalidUrls, null, 2), 'utf-8');
        logger.info(`[image-validator] Completed. Identified ${invalidUrls.length} invalid remote URLs.`);
      }
    }
  };
}
