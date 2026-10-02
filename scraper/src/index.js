/**
 * FlyRank Backend Track - Week 5 Assignment A9: The Polite Scraper
 * Stage 5: Resilient failure handling, test simulation, and run report
 */

import { discoverBookUrls } from './discovery.js';
import { extractAllBookDetails } from './extractor.js';
import { normalizeAndValidateRecords } from './normalizer.js';
import { saveOutputFiles, saveRunReport } from './storage.js';

export async function runScraper(options = {}) {
  const startTime = new Date();
  const simulateFailure = options.simulateFailure ?? process.argv.includes('--simulate-failure') ?? false;

  console.log(`--- A9 Stage 5: The Polite Scraper ---${simulateFailure ? ' [SIMULATE FAILURE MODE]' : ''}`);

  try {
    // 1. Discover catalogue pages (1 to 3)
    const discovery = await discoverBookUrls({
      startUrl: 'https://books.toscrape.com/catalogue/page-1.html',
      maxPages: 3,
      delayMs: 500,
    });

    const itemsToProcess = [...discovery.items];

    // Controlled failure test: inject one deliberately broken 404 URL if simulation is requested
    if (simulateFailure) {
      itemsToProcess.push({
        url: 'https://books.toscrape.com/catalogue/deliberate-broken-page-test-404_99999/index.html',
        sourcePage: 'https://books.toscrape.com/catalogue/page-3.html',
      });
    }

    // 2. Fetch and extract details resiliently
    const extractionResult = await extractAllBookDetails(itemsToProcess, { delayMs: 500 });
    const { rawRecords, failedPages, stats } = extractionResult;

    // 3. Normalize and validate records with Zod
    const { valid, invalid, duplicateCount } = normalizeAndValidateRecords(rawRecords);

    // Combine validation errors and fetch/extraction failure errors
    const allErrors = [
      ...failedPages.map((f) => ({
        type: 'fetch_error',
        url: f.url,
        source_page: f.source_page,
        error: f.error,
        failed_at: f.failed_at,
      })),
      ...invalid.map((inv) => ({
        type: 'validation_error',
        url: inv.record.product_url,
        source_page: inv.record.source_page,
        errors: inv.errors,
        failed_at: inv.failed_at,
      })),
    ];

    // 4. Save output files (books.json, errors.json)
    await saveOutputFiles(valid, allErrors);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // 5. Generate and save run-report.json
    const runReport = {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: durationMs,
      duration_seconds: parseFloat((durationMs / 1000).toFixed(2)),
      catalogue_pages: discovery.cataloguePages,
      pages_fetched: stats.networkFetches,
      cache_hits: stats.cacheHits + discovery.cataloguePages,
      valid_records: valid.length,
      invalid_records: invalid.length,
      failed_pages: failedPages.length,
      duplicate_records: duplicateCount,
      simulate_failure_mode: simulateFailure,
    };

    await saveRunReport(runReport);

    // 6. Print summary
    console.log('\n--- Run Report Summary ---');
    console.log(`duration_ms=${durationMs}`);
    console.log(`pages_fetched=${runReport.pages_fetched}`);
    console.log(`cache_hits=${runReport.cache_hits}`);
    console.log(`valid_records=${runReport.valid_records}`);
    console.log(`invalid_records=${runReport.invalid_records}`);
    console.log(`failed_pages=${runReport.failed_pages}`);
    console.log(`books_json_count=${valid.length}`);
    console.log(`errors_json_count=${allErrors.length}`);

    return runReport;
  } catch (error) {
    console.error('Fatal error during scraping execution:', error);
    process.exitCode = 1;
    throw error;
  }
}

// Auto-run if executed directly via node
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runScraper();
}
