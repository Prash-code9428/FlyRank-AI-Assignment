import fs from 'node:fs/promises';
import path from 'node:path';
import { OUTPUT_DIR } from './config.js';

/**
 * Ensures the output directory exists.
 */
async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

/**
 * Stores valid and invalid records to books.json and errors.json in the output directory.
 *
 * @param {Array<object>} validRecords - Array of schema-validated book records
 * @param {Array<object>} invalidRecords - Array of error objects with failure context
 * @returns {Promise<{ booksFile: string, errorsFile: string }>}
 */
export async function saveOutputFiles(validRecords, invalidRecords) {
  await ensureOutputDir();

  const booksFile = path.resolve(OUTPUT_DIR, 'books.json');
  const errorsFile = path.resolve(OUTPUT_DIR, 'errors.json');

  await fs.writeFile(booksFile, JSON.stringify(validRecords, null, 2), 'utf8');
  await fs.writeFile(errorsFile, JSON.stringify(invalidRecords, null, 2), 'utf8');

  return { booksFile, errorsFile };
}
