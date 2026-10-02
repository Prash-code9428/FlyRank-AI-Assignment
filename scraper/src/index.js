/**
 * FlyRank Backend Track - Week 5 Assignment A9: The Polite Scraper
 * Stage 3: Extract raw book details
 */

import { discoverBookUrls } from './discovery.js';
import { extractAllBookDetails } from './extractor.js';

async function main() {
  console.log('--- A9 Stage 3: Extract Raw Book Details ---');
  try {
    const discovery = await discoverBookUrls({
      startUrl: 'https://books.toscrape.com/catalogue/page-1.html',
      maxPages: 3,
      delayMs: 500,
    });

    console.log(`Discovered ${discovery.uniqueUrls.length} unique book URLs across ${discovery.cataloguePages} catalogue pages.`);

    const rawRecords = await extractAllBookDetails(discovery.items, { delayMs: 500 });

    console.log(`detail_pages=${rawRecords.length}`);
    console.log('\n--- Sample Raw Record ---');
    console.log(JSON.stringify(rawRecords[0], null, 2));
  } catch (error) {
    console.error('Error in Stage 3 extraction:', error.message);
    process.exitCode = 1;
  }
}

main();
