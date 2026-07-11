import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { CHECKSUMS_FILENAME } from './constants.js';

/** One parsed line of a `CHECKSUMS.sha256` file. */
export interface ChecksumEntry {
  sha256: string;
  /** Package-relative path using forward slashes. */
  relativePath: string;
}

/** Compute the lowercase hex SHA-256 of a file, streaming to bound memory. */
export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/** Compute the lowercase hex SHA-256 of an in-memory buffer. */
export function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Recursively list package-relative file paths (forward slashes), excluding the
 * checksums file itself. Order is deterministic (sorted).
 */
export async function listPackageFiles(packageDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        const rel = path.relative(packageDir, abs).split(path.sep).join('/');
        if (rel !== CHECKSUMS_FILENAME) files.push(rel);
      }
    }
  }

  await walk(packageDir);
  files.sort();
  return files;
}

/**
 * Calculate SHA-256 for every file in a package (excluding the checksums file).
 * Returns entries sorted by path for deterministic output.
 */
export async function calculateChecksums(packageDir: string): Promise<ChecksumEntry[]> {
  const files = await listPackageFiles(packageDir);
  const entries: ChecksumEntry[] = [];
  for (const relativePath of files) {
    const sha256 = await sha256File(path.join(packageDir, ...relativePath.split('/')));
    entries.push({ sha256, relativePath });
  }
  return entries;
}

/** Render checksum entries as a standard `sha256sum`-style file body. */
export function formatChecksumsFile(entries: ChecksumEntry[]): string {
  return `${entries.map((e) => `${e.sha256}  ${e.relativePath}`).join('\n')}\n`;
}

/** Parse a `sha256sum`-style file body into entries. */
export function parseChecksumsFile(content: string): ChecksumEntry[] {
  const entries: ChecksumEntry[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Format: "<64 hex>  <path>" (two spaces, but tolerate one or more).
    const match = /^([a-f0-9]{64})\s+(.+)$/.exec(line);
    if (match) {
      entries.push({ sha256: match[1]!, relativePath: match[2]! });
    }
  }
  return entries;
}

/** Read and parse an existing `CHECKSUMS.sha256` from a package directory. */
export async function readChecksumsFile(packageDir: string): Promise<ChecksumEntry[]> {
  const content = await readFile(path.join(packageDir, CHECKSUMS_FILENAME), 'utf8');
  return parseChecksumsFile(content);
}

/** Total size in bytes of every file in a package (excluding checksums file). */
export async function totalPackageSize(packageDir: string): Promise<number> {
  const files = await listPackageFiles(packageDir);
  let total = 0;
  for (const rel of files) {
    const s = await stat(path.join(packageDir, ...rel.split('/')));
    total += s.size;
  }
  return total;
}
