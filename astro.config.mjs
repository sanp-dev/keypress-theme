// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import { remarkStripHeroDuplicate } from './src/plugins/remark-strip-hero-duplicate.mjs';
import { rehypeOptimizeContentImages } from './src/plugins/rehype-optimize-content-images.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { generatePopularPostsFiles } from './src/utils/ga4-popular-posts.mjs';
import { SITE_CONFIG } from './src/config/site.ts';
import { imageValidatorPlugin } from './src/plugins/image-validator.mjs';

// Dynamically resolve CDN hostname for remote image optimization
let cdnHostname = '';
try {
  if (SITE_CONFIG.cdnDomain) {
    cdnHostname = SITE_CONFIG.cdnDomain.replace(/^https?:\/\//, '');
  }
} catch (e) {
  // fallback
}

let siteHostname = '';
try {
  siteHostname = new URL(SITE_CONFIG.domain).hostname;
} catch (e) {
  // fallback
}

function minifyInlineScripts() {
  return {
    name: 'minify-inline-scripts',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const distDir = fileURLToPath(dir);

        async function processDirectory(directory) {
          const entries = await fs.readdir(directory, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
              await processDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
              let html = await fs.readFile(fullPath, 'utf-8');
              let modified = false;

              const matches = [...html.matchAll(/<script(?!.*?src)[^>]*>([\s\S]*?)<\/script>/gi)];

              for (const match of matches) {
                const fullTag = match[0];
                const scriptContent = match[1].trim();

                if (!scriptContent || fullTag.includes('type="application/ld+json"') || fullTag.includes('type="application/json"')) {
                  continue;
                }

                try {
                  const minified = await esbuild.transform(scriptContent, {
                    minify: true,
                    loader: 'js',
                  });

                  const newTag = fullTag.replace(match[1], () => '\n' + minified.code.trim() + '\n');
                  html = html.replace(fullTag, () => newTag);
                  modified = true;
                } catch (err) {
                  console.error(`Failed to minify script in ${entry.name}:`, err);
                }
              }

              if (modified) {
                await fs.writeFile(fullPath, html, 'utf-8');
              }
            }
          }
        }

        await processDirectory(distDir);
        console.log('✓ [minify-inline-scripts] Minified all inline scripts in dist/ successfully!');
      }
    }
  };
}

function popularPostsPlugin() {
  return {
    name: 'popular-posts-plugin',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        logger.info('[popular-posts] Generating popular posts data files...');
        // Resolve public/ directory (next to astro.config.mjs)
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const publicDir = path.join(__dirname, 'public');
        await generatePopularPostsFiles(publicDir);
      },
    },
  };
}


import { passthroughImageService } from 'astro/config';

export default defineConfig({
  site: SITE_CONFIG.domain,
  build: {
    inlineStylesheets: 'always',
  },

  integrations: [
    imageValidatorPlugin(),
    popularPostsPlugin(),
    minifyInlineScripts()
  ],

  markdown: {
    processor: unified({
      remarkPlugins: [remarkStripHeroDuplicate],
      rehypePlugins: [rehypeOptimizeContentImages],
    }),
  },

  image: {
    service: passthroughImageService(),
    remotePatterns: [
      // Allow images from site's own domain
      ...(siteHostname ? [{
        protocol: 'https',
        hostname: siteHostname,
      }] : []),
      // Allow images from external CDN (if configured in site.ts)
      ...(cdnHostname ? [{
        protocol: 'https',
        hostname: cdnHostname,
      }] : []),
      // Fallback: Always allow original demo images CDN to build without warnings
      {
        protocol: 'https',
        hostname: 'images.thesmartadvice.com',
      },
      // Allow Blogger images
      {
        protocol: 'https',
        hostname: 'blogger.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      }
    ],
  },

  vite: {
    plugins: [tailwindcss()]
  }
});