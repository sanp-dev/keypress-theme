// src/utils/image.ts

import { SITE_CONFIG } from '../config/site';
import invalidImages from './invalid-images.json';

/**
 * Strips out the '/cdn-cgi/image/...' path segment from Cloudflare CDN URLs,
 * returning the clean URL for the original raw image.
 * 
 * Uses the cdnDomain from SITE_CONFIG to determine the CDN URL pattern.
 * If no cdnDomain is configured, the URL is returned as-is.
 * 
 * Example (when cdnDomain = "cdn.example.com"):
 * Input: "https://cdn.example.com/cdn-cgi/image/format=auto,width=1280/my-image.jpg"
 * Output: "https://cdn.example.com/my-image.jpg"
 */
export function cleanImageUrl(url: string | undefined | null): string {
  if (!url) return '';

  // If the image URL is verified as offline or invalid, fallback to default local image
  if (invalidImages.includes(url)) {
    return '/default-og-image.jpg';
  }
  
  const cdnDomain = SITE_CONFIG.cdnDomain;
  if (!cdnDomain) return url;

  // Strip protocol from cdnDomain to get bare hostname (e.g. "images.readshayari.in")
  const cdnHostname = cdnDomain.replace(/^https?:\/\//, '');

  if (!url.includes(cdnHostname)) return url;

  // Remove cdn-cgi/image/options/ path segment if present
  const escapedHostname = cdnHostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cdnCgiPattern = new RegExp(`https?://${escapedHostname}/cdn-cgi/image/[^/]+/(.+)`);
  const match = url.match(cdnCgiPattern);
  if (match) {
    return `https://${cdnHostname}/${match[1]}`;
  }

  return url;
}
