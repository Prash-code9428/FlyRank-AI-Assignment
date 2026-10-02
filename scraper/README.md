# Assignment A9: The Polite Scraper

## Overview
A resilient, polite, and deterministic web scraper built with **Node.js 20+**, native `fetch`, **Cheerio**, and **Zod**. The scraper discovers and extracts book information from the Books to Scrape sandbox while strictly honoring web politeness standards, local disk caching, automated validation, and graceful failure handling.

---

## Target Classification

- **Target Site**: [Books to Scrape](http://books.toscrape.com/) (`https://books.toscrape.com/`)
- **Why It Is an Appropriate Sandbox**:
  - As explicitly declared on [toscrape.com](https://toscrape.com/), *Books to Scrape* is a fictional online bookstore created specifically as a dedicated sandbox for developers and students to practice web scraping techniques and benchmark tools safely without impacting real-world commercial platforms or risking unauthorized data harvesting.
- **Scope**: First 3 catalogue pages only (`catalogue/page-1.html`, `catalogue/page-2.html`, and `catalogue/page-3.html`), discovering exactly 60 book detail URLs (20 books per page).
- **Data Collected**:
  - `title`: Book title string
  - `product_url`: Canonical absolute product URL
  - `price_gbp`: Cleaned numeric price in GBP (float)
  - `price_text`: Raw currency string (e.g., `£51.77`)
  - `availability_text`: In-stock / inventory string
  - `rating_text`: Star rating name (`One`, `Two`, `Three`, `Four`, `Five`)
  - `description`: Book overview text (or `null` if none exists on page)
  - `source_page`: The discovering catalogue page URL
  - `fetched_at`: ISO 8601 timestamp string
- **Robots.txt Result**:
  - Request to `https://books.toscrape.com/robots.txt` returned HTTP `404 Not Found`.
  - A missing `robots.txt` is merely a missing file and does not constitute general scraping permission for arbitrary websites. The scraper is strictly scoped to the Books to Scrape practice sandbox.

> **I will not reuse this code on another site without checking its rules and terms first.**

---

## Technical Stack (JavaScript Lane)

- **Runtime**: Node.js 20+ (Node `v24.21.0` tested)
- **HTTP Client**: Built-in native `fetch` (with `AbortController` timeouts)
- **HTML Parser**: [Cheerio](https://cheerio.js.org/) for server-side DOM traversing and CSS selector extraction
- **Schema Validation**: [Zod](https://zod.dev/) for runtime data validation and boundary guarantees
- **Persistence**: Built-in `node:fs/promises` for local HTML cache and JSON artifact storage
- **No Headless Browser**: The application avoids Puppeteer/Playwright because the target site is completely server-side rendered (SSR). All target content exists in the initial static HTML payload returned by the server.

---

## Quick Start & Installation

Clone the repository and install dependencies in under a minute:

```bash
# Clone the repository
git clone https://github.com/Prash-code9428/First_CRUD_API.git
cd First_CRUD_API

# Install dependencies (Express, Cheerio, Zod, etc.)
npm install
```

### One Copy-Pasteable Command to Run the Scraper

```bash
npm run scraper
```
*(Alternatively: `node scraper/src/index.js`)*

---

## Record Schema

Every scraped record is validated against the following strict Zod schema before storage:

```javascript
import { z } from 'zod';

export const BookSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  product_url: z.string().url().refine(
    (url) => url.startsWith('https://'),
    { message: 'product_url must start with https://' }
  ),
  price_gbp: z.number().nonnegative('price_gbp must be non-negative'),
  price_text: z.string().min(1, 'price_text cannot be empty'),
  availability_text: z.string().min(1, 'availability_text cannot be empty'),
  rating_text: z.string().min(1, 'rating_text cannot be empty'),
  description: z.string().nullable().optional(),
  source_page: z.string().url().refine(
    (url) => url.startsWith('https://'),
    { message: 'source_page must start with https://' }
  ),
  fetched_at: z.string().min(1, 'fetched_at must be recorded'),
});
```

---

## Politeness & Resilience Architecture

The scraper adheres to robust scraping ethics and network resilience:

1. **Honest User-Agent**:
   Sends an identifying User-Agent header with every network request:
   `FlyRankInternship-A9/1.0 (+https://github.com/Prash-code9428/First_CRUD_API)`
2. **Request Timeout**:
   Every HTTP request uses an `AbortController` with a 15,000 ms timeout to prevent hanging connections.
3. **Politeness Delay**:
   Enforces a minimum **500 ms delay** strictly between live network fetches (`!fromCache`). Local cache reads bypass the delay entirely.
4. **Local Disk Caching**:
   Every fetched HTML page is saved to `scraper/cache/`. Subsequent runs read from local cache (`CACHE HIT`), producing zero network traffic. All raw HTML cache files are git-ignored via [scraper/.gitignore](file:///d:/FlyRank/scraper/.gitignore).
5. **Strict Status Checking**:
   Only HTTP `200 OK` is treated as a successful response. Non-200 responses throw an `HttpError`.
6. **Smart Retries**:
   - **Retryable Errors**: Timeouts, network interruptions, and HTTP `5xx` server errors are retried exactly once (`maxRetries = 1`) after a 1,000 ms backoff.
   - **Non-Retryable Errors**: HTTP `404 Not Found`, `403 Forbidden`, and `4xx` client errors fail immediately without wasteful retries.
7. **Isolated Failure Boundaries**:
   Each book detail page is processed in an independent `try/catch` block. If a single page fails or returns 404, the failure is logged and recorded in `errors.json` and `run-report.json`, while the remaining books finish successfully without crashing the scraper.

---

## Output Artifacts

All scraper artifacts are saved to `scraper/output/`:

- [scraper/output/books.json](file:///d:/FlyRank/scraper/output/books.json): Contains the array of 60 valid, deduplicated, and normalized book records.
- [scraper/output/errors.json](file:///d:/FlyRank/scraper/output/errors.json): Contains any network failures or records that failed Zod validation, complete with URL and error cause.
- [scraper/output/run-report.json](file:///d:/FlyRank/scraper/output/run-report.json): High-level run metrics including duration, network fetches, cache hits, valid count, and failure count.

### Sample `run-report.json`

```json
{
  "start_time": "2026-10-02T06:06:24.963Z",
  "end_time": "2026-10-02T06:06:25.255Z",
  "duration_ms": 292,
  "duration_seconds": 0.29,
  "catalogue_pages": 3,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "duplicate_records": 0,
  "simulate_failure_mode": false
}
```

---

## Failure Simulation Testing

To verify that the scraper survives broken pages and properly logs failures without crashing, run:

```bash
npm run scraper:test-failure
```
*(or `node scraper/src/index.js --simulate-failure`)*

**Observed behavior:**
- Injects a deliberately non-existent book URL (`deliberate-broken-page-test-404_99999/index.html`).
- The crawler captures the HTTP 404 error, logs `[PAGE FAILURE]`, and continues processing.
- `books.json` preserves all 60 valid books.
- `errors.json` captures the 404 event.
- `run-report.json` logs `"failed_pages": 1`.

---

## Verification & Checkpoint Results

| Checkpoint | Expected | Result |
| :--- | :--- | :--- |
| **Catalogue Pages Traversed** | 3 (`page-1.html`, `page-2.html`, `page-3.html`) | `3` |
| **Discovered Book URLs** | 60 unique URLs (20 per page) | `60` |
| **Valid Saved Records** | Exactly 60 records in `books.json` | `60` |
| **Canonical HTTPS URLs** | 100% start with `https://` | `100%` |
| **Numeric Price in GBP** | All `price_gbp` are numbers | `100%` |
| **Idempotency** | Subsequent runs maintain exactly 60 records | `Passed` |
| **Broken Page Resilience** | Survives 404, logs to `errors.json`, `failed_pages=1` | `Passed` |
| **Run Report Generation** | Automatically writes `run-report.json` on every run | `Passed` |

---

## Ethics Statement

Responsible web scraping requires respecting target infrastructure and legal boundaries:

1. **Prefer Official APIs**: Always inspect for public or authenticated REST/GraphQL APIs before resorting to scraping HTML.
2. **Never Bypass Authentication**: Never write scrapers that attempt to bypass login walls, credential challenges, or CAPTCHAs.
3. **Never Circumvent Access Controls**: Never attempt to bypass paywalls, IP blocks, or rate limits via proxy rotation without permission.
4. **Collect Minimal Data**: Scrape only the specific data fields required for the stated application purpose; avoid broad hoarding of unrelated metadata.
5. **Honor Politeness**: Respect `robots.txt` guidelines, provide an honest identifying User-Agent with contact info, and throttle request frequencies with adequate delays and local caching.

---

## Known Limitations

1. **Static DOM Selector Coupling**: Cheerio relies on fixed CSS selectors (e.g. `.product_main h1`, `.price_color`). If the host site modifies its HTML layout or CSS classes, selector logic must be updated.
2. **Sequential Discovery**: Pagination traversal occurs sequentially from page 1 to 3 to adhere strictly to the politeness delay between catalogue requests.
3. **In-Memory URL Set**: URL deduplication uses an in-memory `Set`, which is optimal for small-to-medium scrapes (such as 60 records) but would require a persistent bloom filter or database for scraping millions of records.
