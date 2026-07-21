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

/** All audio codecs an OMD package may use (one codec per package). */
export const AUDIO_CODECS = ['FLAC', 'MP3', 'AAC', 'Vorbis', 'Opus', 'WAV'] as const;
export type AudioCodec = (typeof AUDIO_CODECS)[number];

/** The default codec when a source has none (or for new empty packages). */
export const DEFAULT_AUDIO_CODEC: AudioCodec = 'FLAC';

/** File extensions recognized for each codec (first entry is the canonical one). */
export const AUDIO_CODEC_EXTENSIONS: Record<AudioCodec, string[]> = {
  FLAC: ['.flac'],
  MP3: ['.mp3'],
  AAC: ['.m4a', '.aac', '.mp4'],
  Vorbis: ['.ogg', '.oga'],
  Opus: ['.opus'],
  WAV: ['.wav', '.wave'],
};

/** Codecs that carry lossless audio (informational; not a quality guarantee). */
export const LOSSLESS_CODECS: readonly AudioCodec[] = ['FLAC', 'WAV'];

/** MIME type used when streaming a file of a given codec. */
export const AUDIO_CODEC_MIME: Record<AudioCodec, string> = {
  FLAC: 'audio/flac',
  MP3: 'audio/mpeg',
  AAC: 'audio/mp4',
  Vorbis: 'audio/ogg',
  Opus: 'audio/ogg',
  WAV: 'audio/wav',
};

/** Every recognized audio file extension, lowercased with a leading dot. */
export const ALL_AUDIO_EXTENSIONS: readonly string[] = Object.values(AUDIO_CODEC_EXTENSIONS).flat();

/** Resolve a file extension (e.g. ".mp3") to its codec, or undefined. */
export function codecForExtension(ext: string): AudioCodec | undefined {
  const lower = ext.toLowerCase();
  for (const codec of AUDIO_CODECS) {
    if (AUDIO_CODEC_EXTENSIONS[codec].includes(lower)) return codec;
  }
  return undefined;
}

/** The canonical file extension for a codec (e.g. "FLAC" -> ".flac"). */
export function extensionForCodec(codec: AudioCodec): string {
  return AUDIO_CODEC_EXTENSIONS[codec][0]!;
}

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
