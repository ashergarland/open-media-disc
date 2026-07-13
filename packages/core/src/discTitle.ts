import { createHash } from 'node:crypto';

import type { OmdManifest } from './manifest.js';

/** Maximum length of a `discId` / disc title. Mirrors the manifest schema. */
export const MAX_DISC_TITLE_LENGTH = 200;

/** Conservative, broadly compatible cap for a derived UDF volume label. */
export const MAX_VOLUME_LABEL_LENGTH = 32;

/**
 * Turn a disc title into a filesystem-safe folder name.
 *
 * Removes characters that are illegal in Windows or POSIX paths
 * (`\\ / : * ? " < > |` and control characters), collapses whitespace, and
 * strips trailing dots and spaces. Unicode letters are preserved so the folder
 * stays human-readable. Never returns an empty string.
 */
export function slugifyForPath(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, ' ')
    // eslint-disable-next-line no-control-regex -- intentionally strip control chars from titles
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/u, '')
    .trim();
  return cleaned.length > 0 ? cleaned : 'OMD-disc';
}

/** Truncate and trim a candidate label to the volume-label length budget. */
function truncateLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > MAX_VOLUME_LABEL_LENGTH
    ? trimmed.slice(0, MAX_VOLUME_LABEL_LENGTH).trim()
    : trimmed;
}

/**
 * Normalize a candidate into an uppercase ASCII token suitable for a volume
 * label on media that cannot store Unicode. Returns an empty string when the
 * candidate has no usable ASCII characters.
 */
function asciiLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, MAX_VOLUME_LABEL_LENGTH)
    .replace(/_+$/g, '');
}

/** Short, stable content hash used as the last-resort volume label. */
function shortHash(manifest: OmdManifest): string {
  const seed = `${manifest.discId}\u0000${manifest.artist}\u0000${manifest.album}`;
  return createHash('sha256').update(seed).digest('hex').slice(0, 8).toUpperCase();
}

/** Options for {@link deriveVolumeLabel}. */
export interface DeriveVolumeLabelOptions {
  /**
   * Force an ASCII-only, uppercase/underscore label. Use when the target
   * burner or filesystem cannot store a Unicode volume identifier.
   */
  ascii?: boolean;
}

/**
 * Compute a best-effort UDF volume label for a disc.
 *
 * By default this prefers the Unicode disc title (`manifest.discId`), trimmed
 * and length-capped. When `ascii` is requested, or when the title has no usable
 * characters, it degrades in order: an ASCII rendering of the title, then the
 * first track title, then the artist, then a short content hash. The result is
 * always a non-empty label, so a burn never fails on the title alone. A disc's
 * identity is always read from the manifest, never from this label.
 */
export function deriveVolumeLabel(
  manifest: OmdManifest,
  options: DeriveVolumeLabelOptions = {},
): string {
  const title = manifest.discId.trim();
  if (!options.ascii && title.length > 0) {
    return truncateLabel(title);
  }

  const candidates = [title, manifest.tracks[0]?.title ?? '', manifest.artist];
  for (const candidate of candidates) {
    const label = asciiLabel(candidate);
    if (label.length > 0) {
      return label;
    }
  }
  return `OMD-${shortHash(manifest)}`;
}
