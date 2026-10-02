import { BookSchema } from './schema.js';

/**
 * Ensures a URL is canonical with https protocol.
 * @param {string} urlStr
 * @returns {string}
 */
export function canonicalizeUrl(urlStr) {
  try {
    const urlObj = new URL(urlStr);
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:';
    }
    return urlObj.href;
  } catch {
    return urlStr;
  }
}

/**
 * Normalizes a raw book detail record.
 *
 * @param {object} raw
 * @returns {object} Normalized record
 */
export function normalizeRecord(raw) {
  let price_gbp = NaN;
  if (typeof raw.price_text === 'string') {
    const match = raw.price_text.replace(/[^0-9.]/g, '');
    if (match.length > 0) {
      price_gbp = parseFloat(match);
    }
  }

  const product_url = typeof raw.product_url === 'string' ? canonicalizeUrl(raw.product_url) : raw.product_url;
  const source_page = typeof raw.source_page === 'string' ? canonicalizeUrl(raw.source_page) : raw.source_page;

  return {
    title: raw.title || '',
    product_url,
    price_gbp,
    price_text: raw.price_text || '',
    availability_text: raw.availability_text || '',
    rating_text: raw.rating_text || '',
    description: raw.description ?? null,
    source_page,
    fetched_at: raw.fetched_at || new Date().toISOString(),
  };
}

/**
 * Normalizes, deduplicates, and validates an array of raw records against BookSchema.
 *
 * @param {Array<object>} rawRecords
 * @returns {{ valid: Array<object>, invalid: Array<object>, duplicateCount: number }}
 */
export function normalizeAndValidateRecords(rawRecords) {
  const seenUrls = new Set();
  const valid = [];
  const invalid = [];
  let duplicateCount = 0;

  for (const raw of rawRecords) {
    const normalized = normalizeRecord(raw);

    // Deduplicate by canonical product_url
    if (seenUrls.has(normalized.product_url)) {
      duplicateCount++;
      continue;
    }
    seenUrls.add(normalized.product_url);

    // Validate with Zod schema
    const parseResult = BookSchema.safeParse(normalized);
    if (parseResult.success) {
      valid.push(parseResult.data);
    } else {
      invalid.push({
        record: normalized,
        errors: parseResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
        failed_at: new Date().toISOString(),
      });
    }
  }

  return {
    valid,
    invalid,
    duplicateCount,
  };
}
