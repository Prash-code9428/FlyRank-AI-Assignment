import fs from 'node:fs/promises';
import path from 'node:path';
import { CACHE_DIR, USER_AGENT, DEFAULT_TIMEOUT_MS } from './config.js';

/**
 * Custom error class for HTTP response failures.
 */
export class HttpError extends Error {
  constructor(status, statusText, url) {
    super(`HTTP ${status} ${statusText} for URL: ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/**
 * Ensures cache directory exists.
 */
async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Utility helper to pause execution.
 * @param {number} ms
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if a fetch error is retryable.
 * Retries: timeouts, network errors, and HTTP 5xx server errors.
 * Does NOT retry: HTTP 404, 403, or other 4xx client errors.
 *
 * @param {Error} error
 * @returns {boolean}
 */
export function isRetryableError(error) {
  if (error instanceof HttpError) {
    // 404, 403 and other 4xx are client errors — do NOT retry
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    // 5xx are server errors — retry
    if (error.status >= 500) {
      return true;
    }
  }
  // AbortError / Timeout or generic network error — retry
  return true;
}

/**
 * Fetches HTML from a URL with caching, custom User-Agent, timeout, and resilient retry logic.
 *
 * @param {string} url - Target URL to fetch
 * @param {string} cacheFilename - Relative filename within scraper/cache
 * @param {object} [options]
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds
 * @param {boolean} [options.forceRefresh] - If true, bypass cache and re-fetch
 * @param {number} [options.maxRetries] - Number of retries on retryable errors (default: 1)
 * @param {number} [options.retryDelayMs] - Delay before retry in ms (default: 1000)
 * @returns {Promise<{ html: string, fromCache: boolean, bytes: number, status: number }>}
 */
export async function fetchWithCache(url, cacheFilename, options = {}) {
  await ensureCacheDir();

  const cachePath = path.resolve(CACHE_DIR, cacheFilename);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 1;
  const retryDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : 1000;

  // 1. Check cache first
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
      if (err.code !== 'ENOENT') {
        console.warn(`Warning: Failed to read cache file ${cachePath}:`, err.message);
      }
    }
  }

  // 2. Perform network fetch with retry logic
  let attempt = 0;
  while (true) {
    attempt++;
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
        throw new HttpError(response.status, response.statusText, url);
      }

      const html = await response.text();
      const bytes = Buffer.byteLength(html, 'utf8');

      // Save to local disk cache
      await fs.writeFile(cachePath, html, 'utf8');

      console.log(`FETCH ${url} status=${response.status} bytes=${bytes}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
      return {
        html,
        fromCache: false,
        bytes,
        status: response.status,
      };
    } catch (err) {
      let finalError = err;
      if (err.name === 'AbortError') {
        finalError = new Error(`Request timed out after ${timeoutMs}ms for URL: ${url}`);
      }

      const retryable = isRetryableError(finalError);

      if (retryable && attempt <= maxRetries) {
        console.warn(`[RETRY] Fetch failed for ${url} (${finalError.message}). Retrying in ${retryDelayMs}ms... (Attempt ${attempt}/${maxRetries + 1})`);
        await wait(retryDelayMs);
        continue;
      }

      // Non-retryable or retries exhausted
      throw finalError;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
