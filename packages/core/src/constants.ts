/**
 * Format-level constants for Open Media Disc (OMD) Core v0.1.
 * These describe the on-disc/on-package contract and must stay in sync with
 * the documents under `spec/`.
 */

/** The OMD data format identifier written to every manifest. */
export const OMD_FORMAT = 'OMD-FLAC-DATA' as const;

/** The current OMD format contract version. */
export const OMD_VERSION = '0.1.0' as const;

/** Default target physical medium. */
export const DEFAULT_MEDIA_TYPE = '8cm DVD-RW' as const;

/** Default intended optical filesystem for a future burn step. */
export const DEFAULT_FILESYSTEM_TARGET = 'UDF' as const;

/** The only audio codec supported in v0.1. */
export const AUDIO_CODEC = 'FLAC' as const;

/** Required package file: the album manifest, at the package root. */
export const MANIFEST_FILENAME = 'OMD-MANIFEST.json' as const;

/** Required package file: sha256sum-style integrity list. */
export const CHECKSUMS_FILENAME = 'CHECKSUMS.sha256' as const;

/** Required package directory holding FLAC tracks. */
export const AUDIO_DIR = 'AUDIO' as const;

/** Optional booklet file at the package root. */
export const BOOKLET_FILENAME = 'BOOKLET.pdf' as const;

/**
 * Usable capacity budget for an 8cm DVD-RW, in bytes (~1.4 GB).
 * Packages larger than this trigger a capacity warning (error in strict mode).
 */
export const DVD_RW_8CM_USABLE_BYTES = 1_400_000_000;

/** Source-folder cover-art filenames recognized during package creation. */
export const COVER_ART_SOURCE_NAMES = [
  'cover.jpg',
  'cover.jpeg',
  'cover.png',
  'folder.jpg',
  'folder.jpeg',
  'folder.png',
  'front.jpg',
  'front.jpeg',
  'front.png',
] as const;

/** OS artifact names/prefixes that must never appear in a package. */
export const OS_JUNK_NAMES = ['.DS_Store', 'Thumbs.db', 'desktop.ini'] as const;
export const OS_JUNK_PREFIXES = ['._', '__MACOSX'] as const;

/** FLAC stream magic: ASCII "fLaC". */
export const FLAC_MAGIC = Buffer.from([0x66, 0x4c, 0x61, 0x43]);
