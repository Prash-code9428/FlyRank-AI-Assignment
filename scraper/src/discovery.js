import * as cheerio from 'cheerio';
import { fetchWithCache } from './fetcher.js';

/**
 * Utility to wait for a given duration in milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts book detail page absolute URLs and the next pagination URL from a catalogue page HTML.
 *
 * @param {string} html - HTML string of the catalogue page
 * @param {string} pageUrl - The URL of the catalogue page (for resolving relative URLs)
 * @returns {{ bookUrls: string[], nextUrl: string | null }}
 */
export function parseCataloguePage(html, pageUrl) {
  const $ = cheerio.load(html);
  const bookUrls = [];

  // Each product pod has an h3 tag with an anchor containing the book title and detail href
  $('article.product_pod h3 a').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      const absoluteUrl = new URL(href, pageUrl).href;
      bookUrls.push(absoluteUrl);
    }
  });

  // Extract next page link if present
  const nextHref = $('li.next a, .pager .next a').attr('href');
  let nextUrl = null;
  if (nextHref) {
    nextUrl = new URL(nextHref, pageUrl).href;
  }

  return { bookUrls, nextUrl };
}

/**
 * Discovers book URLs by crawling catalogue pages up to maxPages.
 *
 * @param {object} options
 * @param {string} [options.startUrl] - Initial catalogue URL
 * @param {number} [options.maxPages] - Max catalogue pages to crawl (default: 3)
 * @param {number} [options.delayMs] - Politeness delay between real HTTP fetches (default: 500ms)
 * @returns {Promise<{ cataloguePages: number, discovered: number, uniqueUrls: string[], items: Array<{ url: string, sourcePage: string }> }>}
 */
export async function discoverBookUrls(options = {}) {
  const startUrl = options.startUrl || 'https://books.toscrape.com/catalogue/page-1.html';
  const maxPages = options.maxPages !== undefined ? options.maxPages : 3;
  const delayMs = options.delayMs !== undefined ? options.delayMs : 500;

  let currentUrl = startUrl;
  let pageCount = 0;
  const allDiscovered = [];
  const rawItems = [];

  while (currentUrl && pageCount < maxPages) {
    pageCount++;
    const cacheFilename = `catalogue-page-${pageCount}.html`;

    const { html, fromCache } = await fetchWithCache(currentUrl, cacheFilename);
    const { bookUrls, nextUrl } = parseCataloguePage(html, currentUrl);

    for (const url of bookUrls) {
      allDiscovered.push(url);
      rawItems.push({ url, sourcePage: currentUrl });
    }

    currentUrl = nextUrl;

    // Apply politeness delay ONLY after a real network fetch and if more pages remain
    if (!fromCache && currentUrl && pageCount < maxPages && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // Deduplicate discovered URLs while preserving deterministic order
  const seen = new Set();
  const items = [];
  for (const item of rawItems) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      items.push(item);
    }
  }

  const uniqueUrls = items.map((i) => i.url);

  return {
    cataloguePages: pageCount,
    discovered: allDiscovered.length,
    uniqueUrls,
    items,
  };
}
