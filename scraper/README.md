# Assignment A9: The Polite Scraper

## Overview
A polite web scraper built with Node.js, native `fetch`, Cheerio, and Zod that extracts book records from the Books to Scrape sandbox while respecting politeness guidelines, rate-limiting, and local caching.

---

## Target Classification

- **Target Site**: [Books to Scrape](http://books.toscrape.com/) (`http://books.toscrape.com/` / `https://books.toscrape.com/`)
- **Why It Is Appropriate**:
  - As explicitly stated on [toscrape.com](https://toscrape.com/), *Books to Scrape* is a fictional bookstore created specifically as a scraping sandbox and safe testing ground for beginners and developers to practice web scraping and validate scraping technologies without impacting real-world commercial platforms.
- **Scope**: First 3 catalogue pages only (`catalogue/page-1.html`, `catalogue/page-2.html`, and `catalogue/page-3.html`), discovering exactly 60 book detail URLs (20 books per page).
- **Data Collected**: Book detail fields from the 60 product pages:
  - Title
  - Price (numeric value normalized from currency string)
  - Availability / Stock status
  - Star rating (normalized numeric scale 1–5)
  - Product description
  - UPC / Product code
  - Detail page URL
- **Robots.txt Result**:
  - Request to `https://books.toscrape.com/robots.txt` returned HTTP `404 Not Found`.
  - A missing `robots.txt` file is merely a missing file and must never be interpreted as implicit permission to scrape arbitrary sites. The only target for this assignment is the dedicated Books to Scrape sandbox.

I will not reuse this code on another site without checking its rules and terms first.
