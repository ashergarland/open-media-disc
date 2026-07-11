import { OS_JUNK_NAMES, OS_JUNK_PREFIXES } from './constants.js';

/** Characters not allowed in cross-platform-safe filenames. */
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARS = /[\\/:*?"<>|\u0000-\u001f]/;

/** Windows reserved device names (case-insensitive, without extension). */
const RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
]);

/** True when a single path segment (not a full path) is an OS junk artifact. */
export function isOsJunkName(name: string): boolean {
  if (OS_JUNK_NAMES.includes(name as (typeof OS_JUNK_NAMES)[number])) return true;
  return OS_JUNK_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** True when a filename is safe across Windows/macOS/Linux. */
export function isPortableFilename(name: string): boolean {
  if (name.length === 0 || name.length > 255) return false;
  if (ILLEGAL_CHARS.test(name)) return false;
  if (name.endsWith('.') || name.endsWith(' ')) return false;
  const base = name.split('.')[0]!.toUpperCase();
  if (RESERVED_NAMES.has(base)) return false;
  return true;
}

/**
 * Normalize a filename to a cross-platform-safe form:
 * strip illegal characters, collapse whitespace, and trim trailing dots/spaces.
 * The extension is preserved.
 */
export function normalizeFilename(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const hasExt = lastDot > 0;
  const stem = hasExt ? name.slice(0, lastDot) : name;
  const ext = hasExt ? name.slice(lastDot) : '';

  const cleanedStem = stem
    .replace(ILLEGAL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim();

  const cleanedExt = ext.replace(ILLEGAL_CHARS, '');
  const result = `${cleanedStem}${cleanedExt}` || 'untitled';
  return result;
}
