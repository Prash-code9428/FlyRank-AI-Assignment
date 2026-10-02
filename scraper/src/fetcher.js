import fs from 'node:fs/promises';
import path from 'node:path';
import { CACHE_DIR, USER_AGENT, DEFAULT_TIMEOUT_MS } from './config.js';

/**
 * Ensures cache directory exists.
 */
async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Fetches HTML from a URL with caching, custom User-Agent, timeout, and HTTP 200 validation.
 *
 * @param {string} url - Target URL to fetch
 * @param {string} cacheFilename - Relative filename within scraper/cache
 * @param {object} [options]
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds
 * @param {boolean} [options.forceRefresh] - If true, bypass cache and re-fetch
 * @returns {Promise<{ html: string, fromCache: boolean, bytes: number, status: number }>}
 */
export async function fetchWithCache(url, cacheFilename, options = {}) {
  await ensureCacheDir();

  const cachePath = path.resolve(CACHE_DIR, cacheFilename);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  // Check cache first (unless forceRefresh requested)
  if (!options.forceRefresh) {
    try {
      const cachedHtml = await fs.readFile(cachePath, 'utf8');
      const bytes = Buffer.byteLength(cachedHtml, 'utf8');
      console.log(`CACHE HIT [${cacheFilename}] bytes=${bytes}`);
      return {
        html: cachedHtml,
        fromCache: true,
        bytes,
        status: 200,
      };
    } catch (err) {
      // File does not exist or cannot be read; continue to network fetch
      if (err.code !== 'ENOENT') {
        console.warn(`Warning: Failed to read cache file ${cachePath}:`, err.message);
      }
    }
  }

  // Network Fetch with AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Non-200 HTTP response received: ${response.status} ${response.statusText} for ${url}`);
    }

    const html = await response.text();
    const bytes = Buffer.byteLength(html, 'utf8');

    // Save to local cache
    await fs.writeFile(cachePath, html, 'utf8');

    console.log(`FETCH ${url} status=${response.status} bytes=${bytes}`);
    return {
      html,
      fromCache: false,
      bytes,
      status: response.status,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms for URL: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
