import * as cheerio from 'cheerio';
import { fetchWithCache } from './fetcher.js';
import { sleep } from './discovery.js';

/**
 * Generates a consistent cache filename for a book detail page URL.
 * @param {string} bookUrl
 * @returns {string}
 */
export function getBookCacheFilename(bookUrl) {
  try {
    const parsed = new URL(bookUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const slug = (segments.length > 1 && segments[segments.length - 1] === 'index.html')
      ? segments[segments.length - 2]
      : (segments[segments.length - 1] || 'book');
    return `book-${slug}.html`;
  } catch {
    const sanitized = bookUrl.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `book-${sanitized}.html`;
  }
}

/**
 * Extracts raw book data from book detail page HTML.
 *
 * @param {string} html - Raw HTML of book detail page
 * @param {string} productUrl - Absolute URL of the book
 * @param {string} sourcePage - URL of the catalogue page that discovered this book
 * @returns {object} Raw book record
 */
export function extractRawBookDetails(html, productUrl, sourcePage) {
  const $ = cheerio.load(html);
  const productMain = $('.product_main');

  // Title
  const title = productMain.find('h1').text().trim() || $('article.product_page h1').text().trim() || '';

  // Price text (e.g., "£51.77")
  const price_text = productMain.find('.price_color').text().trim() || $('.price_color').first().text().trim() || '';

  // Availability text (e.g., "In stock (22 available)")
  const rawAvailability = productMain.find('.availability').text() || $('.availability').first().text() || '';
  const availability_text = rawAvailability.replace(/\s+/g, ' ').trim();

  // Rating text (e.g., "Three")
  let rating_text = '';
  const starElem = productMain.find('.star-rating').length ? productMain.find('.star-rating') : $('.star-rating').first();
  const classList = (starElem.attr('class') || '').split(/\s+/);
  const ratingClass = classList.find((c) => c !== 'star-rating' && c.length > 0);
  if (ratingClass) {
    rating_text = ratingClass;
  }

  // Description from product area (#product_description + p)
  let description = null;
  const descElem = $('#product_description + p');
  if (descElem.length > 0) {
    const text = descElem.text().trim();
    description = text.length > 0 ? text : null;
  }

  return {
    title,
    product_url: productUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Resiliently fetches, caches, and extracts raw book details for a list of discovered book objects.
 * Survives individual page failures without crashing the entire scraper run.
 *
 * @param {Array<{ url: string, sourcePage: string }>} discoveredBooks
 * @param {object} [options]
 * @param {number} [options.delayMs] - Delay between real network requests (default: 500ms)
 * @returns {Promise<{ rawRecords: Array<object>, failedPages: Array<object>, stats: { networkFetches: number, cacheHits: number } }>}
 */
export async function extractAllBookDetails(discoveredBooks, options = {}) {
  const delayMs = options.delayMs !== undefined ? options.delayMs : 500;
  const rawRecords = [];
  const failedPages = [];
  let networkFetches = 0;
  let cacheHits = 0;

  for (let i = 0; i < discoveredBooks.length; i++) {
    const { url, sourcePage } = discoveredBooks[i];
    const cacheFilename = getBookCacheFilename(url);

    try {
      const { html, fromCache } = await fetchWithCache(url, cacheFilename);

      if (fromCache) {
        cacheHits++;
      } else {
        networkFetches++;
      }

      const record = extractRawBookDetails(html, url, sourcePage);
      rawRecords.push(record);

      // Apply politeness delay strictly between real network requests
      if (!fromCache && i < discoveredBooks.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    } catch (err) {
      console.error(`[PAGE FAILURE] Failed to process book URL ${url}: ${err.message}`);
      failedPages.push({
        url,
        source_page: sourcePage,
        error: err.message,
        stage: 'fetch_or_extract',
        failed_at: new Date().toISOString(),
      });
      // Continue loop resiliently
    }
  }

  return {
    rawRecords,
    failedPages,
    stats: {
      networkFetches,
      cacheHits,
    },
  };
}
