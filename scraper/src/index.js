/**
 * FlyRank Backend Track - Week 5 Assignment A9: The Polite Scraper
 * Stage 2: Discover the three catalogue pages
 */

import { discoverBookUrls } from './discovery.js';

async function main() {
  console.log('--- A9 Stage 2: Discover Catalogue Pages ---');
  try {
    const { cataloguePages, discovered, uniqueUrls } = await discoverBookUrls({
      startUrl: 'https://books.toscrape.com/catalogue/page-1.html',
      maxPages: 3,
      delayMs: 500,
    });

    console.log(`catalogue_pages=${cataloguePages}`);
    console.log(`discovered=${discovered}`);
    console.log(`unique_urls=${uniqueUrls.length}`);
  } catch (error) {
    console.error('Error in Stage 2 discovery:', error.message);
    process.exitCode = 1;
  }
}

main();
