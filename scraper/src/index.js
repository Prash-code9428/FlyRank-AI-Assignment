/**
 * FlyRank Backend Track - Week 5 Assignment A9: The Polite Scraper
 * Stage 1: Fetch once, cache once
 */

import { fetchWithCache } from './fetcher.js';

const STAGE_1_URL = 'https://books.toscrape.com/catalogue/page-1.html';
const STAGE_1_CACHE = 'catalogue-page-1.html';

async function main() {
  console.log('--- A9 Stage 1: Fetch and Cache ---');
  try {
    const result = await fetchWithCache(STAGE_1_URL, STAGE_1_CACHE);
    console.log(`Summary: Successfully processed ${STAGE_1_URL} (${result.fromCache ? 'Cache' : 'Network'}, ${result.bytes} bytes)`);
  } catch (error) {
    console.error(`Error in Stage 1:`, error.message);
    process.exitCode = 1;
  }
}

main();
