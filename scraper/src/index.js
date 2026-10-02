/**
 * FlyRank Backend Track - Week 5 Assignment A9: The Polite Scraper
 * Stage 4: Normalize, validate, and store
 */

import { discoverBookUrls } from './discovery.js';
import { extractAllBookDetails } from './extractor.js';
import { normalizeAndValidateRecords } from './normalizer.js';
import { saveOutputFiles } from './storage.js';

async function main() {
  console.log('--- A9 Stage 4: Normalize, Validate, and Store ---');
  try {
    // 1. Discover URLs from 3 catalogue pages
    const discovery = await discoverBookUrls({
      startUrl: 'https://books.toscrape.com/catalogue/page-1.html',
      maxPages: 3,
      delayMs: 500,
    });

    // 2. Fetch/cache and extract raw details
    const rawRecords = await extractAllBookDetails(discovery.items, { delayMs: 500 });

    // 3. Normalize and validate against Zod schema
    const { valid, invalid, duplicateCount } = normalizeAndValidateRecords(rawRecords);

    // 4. Save results to output/books.json and output/errors.json
    await saveOutputFiles(valid, invalid);

    // 5. Checkpoint verifications
    const allUrlsStartWithHttps = valid.every((b) => b.product_url.startsWith('https://'));
    const allPricesAreNumbers = valid.every((b) => typeof b.price_gbp === 'number' && !Number.isNaN(b.price_gbp));
    const uniqueProductUrls = new Set(valid.map((b) => b.product_url));

    console.log('\n--- Execution Summary ---');
    console.log(`discovered_total=${discovery.discovered}`);
    console.log(`detail_pages_processed=${rawRecords.length}`);
    console.log(`valid_records=${valid.length}`);
    console.log(`invalid_records=${invalid.length}`);
    console.log(`duplicate_records=${duplicateCount}`);
    console.log(`books_json_records=${valid.length}`);
    console.log(`errors_json_records=${invalid.length}`);
    console.log(`all_urls_unique=${uniqueProductUrls.size === valid.length}`);
    console.log(`all_urls_https=${allUrlsStartWithHttps}`);
    console.log(`all_prices_numeric=${allPricesAreNumbers}`);

    console.log('\n--- Sample Valid Record ---');
    console.log(JSON.stringify(valid[0], null, 2));
  } catch (error) {
    console.error('Error in Stage 4 execution:', error.message);
    process.exitCode = 1;
  }
}

main();
