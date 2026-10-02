import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCRAPER_ROOT = path.resolve(__dirname, '..');
export const CACHE_DIR = path.resolve(SCRAPER_ROOT, 'cache');
export const OUTPUT_DIR = path.resolve(SCRAPER_ROOT, 'output');

export const BASE_URL = 'https://books.toscrape.com';
export const USER_AGENT = 'FlyRankInternship-A9/1.0 (+https://github.com/Prash-code9428/First_CRUD_API)';

export const DEFAULT_TIMEOUT_MS = 15000;
