import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ALL_AUDIO_EXTENSIONS,
  AUDIO_DIR,
  BOOKLET_FILENAME,
  CHECKSUMS_FILENAME,
  COVER_ART_SOURCE_NAMES,
  DEFAULT_AUDIO_CODEC,
  DVD_RW_8CM_USABLE_BYTES,
  MANIFEST_FILENAME,
  OMD_VERSION,
  codecForExtension,
  extensionForCodec,
  type AudioCodec,
} from './constants.js';
import {
  calculateChecksums,
  formatChecksumsFile,
  parseChecksumsFile,
  sha256File,
  totalPackageSize,
} from './checksums.js';
import { estimateDiscSize } from './discSize.js';
import { readAudioMeta } from './audioMeta.js';
import { canConvertTo, convertAudioFile } from './audioConvert.js';
import { isOsJunkName, isPortableFilename, normalizeFilename } from './filenames.js';
import { slugifyForPath } from './discTitle.js';
import {
  createManifest,
  manifestSchema,
  stringifyManifest,
  validateManifest,
  type OmdManifest,
  type OmdTrack,
} from './manifest.js';
import type {
  PackageValidationResult,
  ValidationCode,
  ValidationIssue,
  ValidationSeverity,
} from './validationTypes.js';

/** Options for {@link createPackage}. */
export interface CreatePackageOptions {
  /** Source album folder containing recognized audio files and optional cover art. */
  sourceDir: string;
  /**
   * Destination package folder. Created if missing. Defaults to
   * `build/<slugified disc title>` when omitted.
   */
  outDir?: string;
  /**
   * Disc title (the editable, human `discId`). Full Unicode and not required to
   * be unique. Defaults to the resolved album title when omitted.
   */
  discId?: string;
  /** Overwrite the output folder if it already exists. Defaults to `false`. */
  overwrite?: boolean;
  /** Override artist (else inferred from tags). */
  artist?: string;
  /** Override album (else inferred from tags). */
  album?: string;
  /** Override release year (else inferred from tags). */
  releaseYear?: number;
  /**
   * Override per-track metadata by resulting (1..N) track number. Fields left
   * blank keep their inferred value. Used by import review flows. Per-track
   * `artist`/`album`/`year` are stored only when they differ from the
   * album-level value.
   */
  trackMeta?: {
    number: number;
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
  }[];
  /**
   * The package codec. Defaults to the most common codec among the source
   * files. Source files already in this codec are copied as-is; files in other
   * codecs are transcoded when {@link CreatePackageOptions.convert} is set, and
   * otherwise skipped.
   */
  audioCodec?: AudioCodec;
  /**
   * Enable transcoding so that source files not already in the package codec are
   * converted to it (rather than skipped). Requires a path to an ffmpeg binary,
   * e.g. from `ffmpeg-static`.
   */
  convert?: {
    /** Absolute path to an ffmpeg executable. */
    ffmpegPath: string;
    /** Target bitrate in kbps for lossy package codecs. */
    bitrateKbps?: number;
  };
  /** Capacity budget in bytes. Defaults to the 8cm DVD-RW budget. */
  budgetBytes?: number;
  /** Generator identity written to the manifest. */
  generator?: { name: string; version: string };
  /** Fixed timestamp for deterministic output (tests). Defaults to now. */
  createdAt?: Date;
  /** Optional progress callback, for a UI progress bar. */
  onProgress?: (progress: CreatePackageProgress) => void;
}

/** Progress of {@link createPackage}, for a UI progress bar. */
export interface CreatePackageProgress {
  /** 'reading' source metadata, 'processing' each track, or 'finalizing'. */
  phase: 'reading' | 'processing' | 'finalizing';
  /** Tracks processed so far (during the 'processing' phase). */
  done: number;
  /** Total tracks to process (0 until known). */
  total: number;
}

/** Result of {@link createPackage}. */
export interface CreatePackageResult {
  outDir: string;
  manifest: OmdManifest;
  validation: PackageValidationResult;
}

/**
 * Thrown by {@link createPackage} when the destination folder already exists and
 * `overwrite` was not set. Callers can catch this to prompt the user or retry
 * with `overwrite: true`.
 */
export class OutputExistsError extends Error {
  /** The output folder that already exists. */
  readonly outDir: string;
  constructor(outDir: string) {
    super(`Output folder already exists: ${outDir}`);
    this.name = 'OutputExistsError';
    this.outDir = outDir;
  }
}

interface SourceTrack {
  sourcePath: string;
  sourceCodec: AudioCodec;
  number: number;
  title: string;
  durationSeconds?: number;
  artist?: string;
  album?: string;
  year?: number;
}

/** Extract a leading track number from a filename like "01 - Boot.flac". */
function numberFromFilename(name: string): number | undefined {
  const match = /^\s*(\d{1,3})/.exec(name);
  return match ? Number.parseInt(match[1]!, 10) : undefined;
}

/** Derive a track title from a filename by stripping a leading number prefix. */
function titleFromFilename(name: string): string {
  const stem = name.replace(/\.[a-z0-9]+$/i, '');
  return stem.replace(/^\s*\d{1,3}\s*[-._)]?\s*/, '').trim() || stem;
}

/** The most common codec among a set of audio filenames. */
function dominantCodec(names: string[]): AudioCodec {
  const counts = new Map<AudioCodec, number>();
  for (const name of names) {
    const codec = codecForExtension(path.extname(name));
    if (codec) counts.set(codec, (counts.get(codec) ?? 0) + 1);
  }
  let best: AudioCodec = DEFAULT_AUDIO_CODEC;
  let bestCount = -1;
  for (const [codec, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = codec;
    }
  }
  return best;
}

/**
 * Create a normalized OMD package from a source album folder.
 *
 * Reads recognized audio files, infers track order and metadata, copies or
 * converts audio into `AUDIO/`, detects cover art, writes `OMD-MANIFEST.json`
 * and `CHECKSUMS.sha256`, then validates the result.
 */
/** Image file extensions the packager will accept as cover art. */
const COVER_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png']);
/** Filename hints that strongly suggest an image is the album cover. */
const COVER_KEYWORDS = ['cover', 'front', 'folder', 'album', 'artwork', 'art', 'scan'];

/** The normalized package cover extension (`.png` or `.jpg`) for a source name. */
function coverExt(name: string): string {
  return path.extname(name).toLowerCase() === '.png' ? '.png' : '.jpg';
}

/**
 * Find the album cover in a source folder, resiliently.
 *
 * Priority: (1) exact well-known names (`cover`/`folder`/`front`.jpg|png), then
 * (2) any image whose filename hints at cover art, then (3) any image at all,
 * choosing the largest file, since album covers are typically the biggest image
 * (small icons/thumbnails lose). Returns the source filename to copy, or
 * `undefined` when the folder holds no images.
 */
async function detectCoverArt(
  sourceDir: string,
  entries: { isFile(): boolean; name: string }[],
): Promise<string | undefined> {
  for (const candidate of COVER_ART_SOURCE_NAMES) {
    const found = entries.find((e) => e.isFile() && e.name.toLowerCase() === candidate);
    if (found) return found.name;
  }
  const images = entries.filter(
    (e) => e.isFile() && COVER_IMAGE_EXTS.has(path.extname(e.name).toLowerCase()),
  );
  if (images.length === 0) return undefined;
  const keyworded = images.filter((e) => {
    const lower = e.name.toLowerCase();
    return COVER_KEYWORDS.some((k) => lower.includes(k));
  });
  const pool = keyworded.length > 0 ? keyworded : images;
  let best = pool[0]!.name;
  let bestSize = -1;
  for (const image of pool) {
    const size = (await stat(path.join(sourceDir, image.name))).size;
    if (size > bestSize) {
      bestSize = size;
      best = image.name;
    }
  }
  return best;
}

/**
 * Read audio metadata for the given files and return them as ordered source
 * tracks numbered sequentially 1..N (source numbers may be 0-indexed, have
 * gaps, collide, or be missing; the sorted order is what is trusted).
 */
async function readSourceTracks(
  sourceDir: string,
  fileNames: string[],
  fallbackCodec: AudioCodec,
): Promise<SourceTrack[]> {
  const sourceTracks: SourceTrack[] = [];
  let fallbackNumber = 1;
  for (const name of fileNames) {
    const sourcePath = path.join(sourceDir, name);
    const sourceCodec = codecForExtension(path.extname(name)) ?? fallbackCodec;
    const meta = await readAudioMeta(sourcePath);
    const number =
      (Number.isFinite(meta.trackNumber) ? meta.trackNumber : undefined) ??
      numberFromFilename(name) ??
      fallbackNumber;
    fallbackNumber = Math.max(fallbackNumber, number) + 1;
    sourceTracks.push({
      sourcePath,
      sourceCodec,
      number,
      title: meta.title ?? titleFromFilename(name),
      ...(meta.durationSeconds !== undefined ? { durationSeconds: meta.durationSeconds } : {}),
      ...(meta.artist ? { artist: meta.artist } : {}),
      ...(meta.album ? { album: meta.album } : {}),
      ...(meta.year !== undefined ? { year: meta.year } : {}),
    });
  }
  sourceTracks.sort((a, b) => a.number - b.number);
  sourceTracks.forEach((track, index) => {
    track.number = index + 1;
  });
  return sourceTracks;
}

/** A preview of the package {@link createPackage} would build from a folder. */
export interface SourceAlbumDraft {
  /** The source folder inspected. */
  sourceDir: string;
  /** The most common codec among the source files (the default target). */
  detectedCodec: AudioCodec;
  /** The distinct codecs present in the source folder. */
  codecsPresent: AudioCodec[];
  /** Inferred album artist ("Various Artists" when tracks differ). */
  artist: string;
  /** Inferred album title. */
  album: string;
  /** A suggested disc title ("Artist - Album"). */
  suggestedDiscId: string;
  /** Inferred release year, if any. */
  releaseYear?: number;
  /** True when the source tracks carry more than one distinct artist. */
  multipleArtists: boolean;
  /** Absolute path to the detected cover image, if any. */
  coverSourcePath?: string;
  /** Tracks in playback order (1..N) with inferred metadata. */
  tracks: {
    number: number;
    title: string;
    artist?: string;
    album?: string;
    year?: number;
    sourceCodec: AudioCodec;
    durationSeconds?: number;
  }[];
}

/** Derive the album artist: an explicit override, the single artist, or "Various Artists". */
function deriveAlbumArtist(tracks: { artist?: string }[], override?: string): string {
  if (override !== undefined) return override;
  const artists = [
    ...new Set(
      tracks.map((t) => t.artist?.trim()).filter((a): a is string => !!a && a.length > 0),
    ),
  ];
  if (artists.length === 0) return 'Unknown Artist';
  if (artists.length === 1) return artists[0]!;
  return 'Various Artists';
}

/**
 * Inspect a source album folder and return the metadata {@link createPackage}
 * would infer, without writing anything. Used by import review flows so the
 * user can confirm or edit the details (and pick a codec) before committing.
 */
export async function inspectSourceAlbum(sourceDir: string): Promise<SourceAlbumDraft> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const audioFiles = entries
    .filter((e) => e.isFile() && ALL_AUDIO_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
  if (audioFiles.length === 0) {
    throw new Error(`No audio files found in source folder: ${sourceDir}`);
  }
  const detectedCodec = dominantCodec(audioFiles);
  const codecsPresent = [
    ...new Set(
      audioFiles
        .map((name) => codecForExtension(path.extname(name)))
        .filter((c): c is AudioCodec => c !== undefined),
    ),
  ];
  const sourceTracks = await readSourceTracks(sourceDir, audioFiles, detectedCodec);
  const distinctArtists = new Set(
    sourceTracks.map((t) => t.artist?.trim()).filter((a): a is string => !!a && a.length > 0),
  );
  const artist = deriveAlbumArtist(sourceTracks);
  const album = sourceTracks.find((t) => t.album)?.album ?? 'Unknown Album';
  const releaseYear = sourceTracks.find((t) => t.year && Number.isFinite(t.year))?.year;
  const coverSource = await detectCoverArt(sourceDir, entries);
  return {
    sourceDir,
    detectedCodec,
    codecsPresent,
    artist,
    album,
    suggestedDiscId: `${artist} - ${album}`,
    multipleArtists: distinctArtists.size > 1,
    ...(releaseYear !== undefined ? { releaseYear } : {}),
    ...(coverSource ? { coverSourcePath: path.join(sourceDir, coverSource) } : {}),
    tracks: sourceTracks.map((t) => ({
      number: t.number,
      title: t.title,
      ...(t.artist ? { artist: t.artist } : {}),
      ...(t.album ? { album: t.album } : {}),
      ...(t.year !== undefined ? { year: t.year } : {}),
      sourceCodec: t.sourceCodec,
      ...(t.durationSeconds !== undefined ? { durationSeconds: t.durationSeconds } : {}),
    })),
  };
}

export async function createPackage(options: CreatePackageOptions): Promise<CreatePackageResult> {
  const { sourceDir } = options;
  const budgetBytes = options.budgetBytes ?? DVD_RW_8CM_USABLE_BYTES;
  const generator = options.generator ?? { name: 'OMD Core', version: OMD_VERSION };

  const entries = await readdir(sourceDir, { withFileTypes: true });

  // Collect audio source files (any recognized codec), then settle on one codec
  // for the whole package: the caller's choice, else the most common codec.
  const audioFiles = entries
    .filter((e) => e.isFile() && ALL_AUDIO_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  if (audioFiles.length === 0) {
    throw new Error(`No audio files found in source folder: ${sourceDir}`);
  }

  const codec = options.audioCodec ?? dominantCodec(audioFiles);
  const converter = options.convert;
  const canConvert = converter !== undefined && canConvertTo(codec);

  // Files already in the package codec are copied as-is; files in other codecs
  // are transcoded when a converter is available, otherwise skipped.
  const usableFiles = audioFiles.filter((name) => {
    const source = codecForExtension(path.extname(name));
    return source !== undefined && (source === codec || canConvert);
  });
  if (usableFiles.length === 0) {
    throw new Error(
      converter
        ? `No convertible audio files found in source folder: ${sourceDir}`
        : `No ${codec} files found in source folder: ${sourceDir}`,
    );
  }

  const sourceTracks = await readSourceTracks(sourceDir, usableFiles, codec);
  const trackTotal = sourceTracks.length;
  options.onProgress?.({ phase: 'reading', done: 0, total: trackTotal });

  // Apply caller-supplied per-track overrides (from an import review view),
  // keyed by the resulting 1..N track number. Blank values keep the inferred
  // metadata.
  const overrideByNumber = new Map(
    (options.trackMeta ?? []).map((t) => [t.number, t] as const),
  );
  for (const track of sourceTracks) {
    const override = overrideByNumber.get(track.number);
    if (!override) continue;
    if (override.title && override.title.trim()) track.title = override.title.trim();
    if (override.artist !== undefined) track.artist = override.artist.trim() || undefined;
    if (override.album !== undefined) track.album = override.album.trim() || undefined;
    if (override.year !== undefined) track.year = Number.isFinite(override.year) ? override.year : undefined;
  }

  const artist = deriveAlbumArtist(sourceTracks, options.artist);
  const album = options.album ?? sourceTracks.find((t) => t.album)?.album ?? 'Unknown Album';
  const releaseYear =
    options.releaseYear ??
    sourceTracks.find((t) => t.year && Number.isFinite(t.year))?.year ??
    undefined;

  // The disc title (discId) defaults to the album title; the output folder
  // defaults to a filesystem-safe slug of that title under `build/`.
  const discId = (options.discId ?? album).trim() || album;
  const outDir = options.outDir ?? path.join('build', slugifyForPath(discId));

  // Refuse to clobber an existing output unless the caller opts in. Thrown
  // before any files are written so a CLI or GUI can prompt and retry.
  if (await pathExists(outDir)) {
    if (!options.overwrite) {
      throw new OutputExistsError(outDir);
    }
    await rm(outDir, { recursive: true, force: true });
  }

  // Prepare output directories.
  const audioOut = path.join(outDir, AUDIO_DIR);
  await mkdir(audioOut, { recursive: true });

  // Copy (or transcode) audio tracks with normalized, ordered filenames.
  const tracks: OmdTrack[] = [];
  let processed = 0;
  for (const track of sourceTracks) {
    options.onProgress?.({ phase: 'processing', done: processed, total: trackTotal });
    const padded = track.number.toString().padStart(2, '0');
    const safeTitle = normalizeFilename(track.title);
    const needsConvert = track.sourceCodec !== codec;
    // Copied files keep their original extension; converted files take the
    // package codec's canonical extension.
    const ext = needsConvert ? extensionForCodec(codec) : path.extname(track.sourcePath).toLowerCase();
    const destName = `${padded} - ${safeTitle}${ext}`;
    const destPath = path.join(audioOut, destName);
    if (needsConvert && converter) {
      await convertAudioFile({
        ffmpegPath: converter.ffmpegPath,
        input: track.sourcePath,
        output: destPath,
        codec,
        ...(converter.bitrateKbps !== undefined ? { bitrateKbps: converter.bitrateKbps } : {}),
      });
    } else {
      await copyFile(track.sourcePath, destPath);
    }

    const size = (await stat(destPath)).size;
    const sha256 = await sha256File(destPath);

    // Per-track artist/album/year are stored only when they differ from the
    // album-level value, so ordinary single-artist albums stay uncluttered.
    const trackArtist =
      track.artist && track.artist.trim() && track.artist.trim() !== artist
        ? track.artist.trim()
        : undefined;
    const trackAlbum =
      track.album && track.album.trim() && track.album.trim() !== album
        ? track.album.trim()
        : undefined;
    const trackYear =
      track.year !== undefined && Number.isFinite(track.year) && track.year !== releaseYear
        ? track.year
        : undefined;

    tracks.push({
      number: track.number,
      title: track.title,
      filename: `${AUDIO_DIR}/${destName}`,
      ...(trackArtist ? { artist: trackArtist } : {}),
      ...(trackAlbum ? { album: trackAlbum } : {}),
      ...(trackYear !== undefined ? { year: trackYear } : {}),
      ...(track.durationSeconds !== undefined
        ? { durationSeconds: track.durationSeconds }
        : {}),
      sizeBytes: size,
      sha256,
    });
    processed += 1;
  }

  options.onProgress?.({ phase: 'finalizing', done: trackTotal, total: trackTotal });

  // Detect and copy cover art (resilient to non-standard filenames).
  let coverArt: string | undefined;
  const coverSource = await detectCoverArt(sourceDir, entries);
  if (coverSource) {
    coverArt = `COVER${coverExt(coverSource)}`;
    await copyFile(path.join(sourceDir, coverSource), path.join(outDir, coverArt));
  }

  // Copy optional booklet.
  let booklet: string | undefined;
  const bookletEntry = entries.find(
    (e) => e.isFile() && e.name.toLowerCase() === BOOKLET_FILENAME.toLowerCase(),
  );
  if (bookletEntry) {
    booklet = BOOKLET_FILENAME;
    await copyFile(path.join(sourceDir, bookletEntry.name), path.join(outDir, BOOKLET_FILENAME));
  }

  // Build and write the manifest.
  const manifest = createManifest({
    discId,
    artist,
    album,
    audioCodec: codec,
    ...(releaseYear !== undefined ? { releaseYear } : {}),
    tracks,
    ...(coverArt ? { coverArt } : {}),
    ...(booklet ? { booklet } : {}),
    generator,
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
  });
  await writeFile(path.join(outDir, MANIFEST_FILENAME), stringifyManifest(manifest), 'utf8');

  // Compute checksums over the whole package (manifest included) and write file.
  const checksumEntries = await calculateChecksums(outDir);
  await writeFile(
    path.join(outDir, CHECKSUMS_FILENAME),
    formatChecksumsFile(checksumEntries),
    'utf8',
  );

  const validation = await validatePackage(outDir, { budgetBytes });

  return { outDir, manifest, validation };
}

/** One track selected for a mixtape. */
export interface MixtapeTrackInput {
  /** Absolute path to a source FLAC file. */
  sourcePath: string;
  /** Optional title override (else taken from FLAC tags / filename). */
  title?: string;
}

/** Options for {@link createMixtape}. */
export interface CreateMixtapeOptions {
  /** The tracks, in the desired play order. */
  tracks: MixtapeTrackInput[];
  /** Disc title (human `discId`). */
  discId: string;
  /** Artist (for a multi-artist mix, "Various Artists" is typical). */
  artist: string;
  /** Album / mixtape name. */
  album: string;
  /** Destination package folder. */
  outDir: string;
  releaseYear?: number;
  /** Absolute path to a cover image (.jpg/.jpeg/.png). */
  coverSourcePath?: string;
  overwrite?: boolean;
  /**
   * The package codec. Defaults to the codec shared by all tracks, or the most
   * common codec when they differ.
   */
  audioCodec?: AudioCodec;
  /**
   * Enable transcoding so tracks not already in the package codec are converted
   * to it (rather than rejected). Requires a path to an ffmpeg binary.
   */
  convert?: {
    /** Absolute path to an ffmpeg executable. */
    ffmpegPath: string;
    /** Target bitrate in kbps for lossy package codecs. */
    bitrateKbps?: number;
  };
  generator?: { name: string; version: string };
  createdAt?: Date;
}

/**
 * Build an OMD package from a curated, ordered list of tracks pulled from
 * anywhere (e.g. several catalog albums), a mixtape. Tracks are renumbered
 * 1..N, copied (or transcoded to a single codec) into `AUDIO/`, and a fresh
 * manifest + checksums are written.
 */
export async function createMixtape(options: CreateMixtapeOptions): Promise<CreatePackageResult> {
  const generator = options.generator ?? { name: 'OMD Core', version: OMD_VERSION };
  if (options.tracks.length === 0) {
    throw new Error('A mixtape needs at least one track.');
  }
  const discId = options.discId.trim() || options.album;
  const { outDir } = options;

  if (await pathExists(outDir)) {
    if (!options.overwrite) throw new OutputExistsError(outDir);
    await rm(outDir, { recursive: true, force: true });
  }
  const audioOut = path.join(outDir, AUDIO_DIR);
  await mkdir(audioOut, { recursive: true });

  // A mixtape package is single-codec. Settle on one target codec; tracks in a
  // different codec are transcoded when a converter is available, else rejected.
  const trackCodecs = options.tracks.map(
    (t) => codecForExtension(path.extname(t.sourcePath)) ?? DEFAULT_AUDIO_CODEC,
  );
  const codec =
    options.audioCodec ??
    dominantCodec(options.tracks.map((t) => t.sourcePath));
  const converter = options.convert;
  const canConvert = converter !== undefined && canConvertTo(codec);
  if (!canConvert && trackCodecs.some((c) => c !== codec)) {
    throw new Error(
      'All mixtape tracks must use the same audio codec. Enable conversion or pick a single codec.',
    );
  }

  const tracks: OmdTrack[] = [];
  let number = 1;
  for (const input of options.tracks) {
    const meta = await readAudioMeta(input.sourcePath);
    const title =
      (input.title ?? meta.title ?? titleFromFilename(path.basename(input.sourcePath))).trim() ||
      `Track ${number}`;
    const padded = number.toString().padStart(2, '0');
    const sourceCodec = codecForExtension(path.extname(input.sourcePath)) ?? codec;
    const needsConvert = sourceCodec !== codec;
    const ext = needsConvert ? extensionForCodec(codec) : path.extname(input.sourcePath).toLowerCase();
    const destName = `${padded} - ${normalizeFilename(title)}${ext}`;
    const destPath = path.join(audioOut, destName);
    if (needsConvert && converter) {
      await convertAudioFile({
        ffmpegPath: converter.ffmpegPath,
        input: input.sourcePath,
        output: destPath,
        codec,
        ...(converter.bitrateKbps !== undefined ? { bitrateKbps: converter.bitrateKbps } : {}),
      });
    } else {
      await copyFile(input.sourcePath, destPath);
    }
    const size = (await stat(destPath)).size;
    const sha256 = await sha256File(destPath);
    tracks.push({
      number,
      title,
      filename: `${AUDIO_DIR}/${destName}`,
      ...(meta.durationSeconds !== undefined ? { durationSeconds: meta.durationSeconds } : {}),
      sizeBytes: size,
      sha256,
    });
    number += 1;
  }

  let coverArt: string | undefined;
  if (options.coverSourcePath) {
    coverArt = `COVER${coverExt(options.coverSourcePath)}`;
    await copyFile(options.coverSourcePath, path.join(outDir, coverArt));
  }

  const manifest = createManifest({
    discId,
    artist: options.artist,
    album: options.album,
    audioCodec: codec,
    ...(options.releaseYear !== undefined ? { releaseYear: options.releaseYear } : {}),
    tracks,
    ...(coverArt ? { coverArt } : {}),
    generator,
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
  });
  await writeFile(path.join(outDir, MANIFEST_FILENAME), stringifyManifest(manifest), 'utf8');
  const checksumEntries = await calculateChecksums(outDir);
  await writeFile(
    path.join(outDir, CHECKSUMS_FILENAME),
    formatChecksumsFile(checksumEntries),
    'utf8',
  );
  const validation = await validatePackage(outDir, { budgetBytes: DVD_RW_8CM_USABLE_BYTES });
  return { outDir, manifest, validation };
}

/** Options for {@link validatePackage}. */
export interface ValidatePackageOptions {
  /** Capacity budget in bytes. Defaults to the 8cm DVD-RW budget. */
  budgetBytes?: number;
  /** When true, a capacity overflow is reported as an error instead of a warning. */
  strict?: boolean;
}

function makeIssue(
  severity: ValidationSeverity,
  code: ValidationCode,
  message: string,
  filePath?: string,
): ValidationIssue {
  return filePath ? { severity, code, message, path: filePath } : { severity, code, message };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an OMD package directory against the OMD v0.1 rules.
 * See `spec/OMD_VALIDATION_RULES.md` for the ordered checks and codes.
 */
export async function validatePackage(
  packageDir: string,
  options: ValidatePackageOptions = {},
): Promise<PackageValidationResult> {
  const budgetBytes = options.budgetBytes ?? DVD_RW_8CM_USABLE_BYTES;
  const issues: ValidationIssue[] = [];

  const manifestPath = path.join(packageDir, MANIFEST_FILENAME);

  // 1. Structure: manifest present + parseable + schema-valid.
  if (!(await pathExists(manifestPath))) {
    issues.push(makeIssue('error', 'MISSING_MANIFEST', `Missing ${MANIFEST_FILENAME}`));
    return finalize(issues);
  }

  let manifest: OmdManifest;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const data = JSON.parse(raw);
    const result = validateManifest(data);
    if (!result.valid || !result.manifest) {
      for (const issue of result.issues) {
        issues.push(makeIssue('error', 'MANIFEST_SCHEMA_ERROR', issue, MANIFEST_FILENAME));
      }
      return finalize(issues);
    }
    manifest = result.manifest;
  } catch (err) {
    issues.push(
      makeIssue(
        'error',
        'MANIFEST_PARSE_ERROR',
        `Manifest is not valid JSON: ${(err as Error).message}`,
        MANIFEST_FILENAME,
      ),
    );
    return finalize(issues);
  }

  // 2. Format + version.
  if (!manifest.omdFormat.startsWith('OMD-')) {
    issues.push(
      makeIssue('error', 'UNSUPPORTED_FORMAT', `Unsupported omdFormat: ${manifest.omdFormat}`),
    );
  }
  if (manifest.omdVersion !== OMD_VERSION && compareSemver(manifest.omdVersion, OMD_VERSION) > 0) {
    issues.push(
      makeIssue(
        'warning',
        'UNKNOWN_OMD_VERSION',
        `Manifest omdVersion ${manifest.omdVersion} is newer than supported ${OMD_VERSION}`,
      ),
    );
  }

  // Required structure files.
  if (!(await pathExists(path.join(packageDir, CHECKSUMS_FILENAME)))) {
    issues.push(makeIssue('error', 'MISSING_CHECKSUMS_FILE', `Missing ${CHECKSUMS_FILENAME}`));
  }
  if (!(await pathExists(path.join(packageDir, AUDIO_DIR)))) {
    issues.push(makeIssue('error', 'MISSING_AUDIO_DIR', `Missing ${AUDIO_DIR}/ directory`));
  }

  // 3. Tracks.
  if (manifest.trackCount !== manifest.tracks.length) {
    issues.push(
      makeIssue(
        'error',
        'TRACK_COUNT_MISMATCH',
        `trackCount ${manifest.trackCount} does not match tracks.length ${manifest.tracks.length}`,
      ),
    );
  }

  const seenNumbers = new Set<number>();
  for (const track of manifest.tracks) {
    if (seenNumbers.has(track.number)) {
      issues.push(
        makeIssue(
          'error',
          'DUPLICATE_TRACK_NUMBER',
          `Duplicate track number ${track.number}`,
          track.filename,
        ),
      );
    }
    seenNumbers.add(track.number);

    const trackPath = path.join(packageDir, ...track.filename.split('/'));
    if (!(await pathExists(trackPath))) {
      issues.push(
        makeIssue('error', 'MISSING_TRACK_FILE', `Track file missing: ${track.filename}`, track.filename),
      );
      continue;
    }
    const trackCodec = codecForExtension(path.extname(track.filename));
    if (trackCodec !== manifest.audioCodec) {
      issues.push(
        makeIssue(
          'error',
          'TRACK_CODEC_MISMATCH',
          `Track codec (${trackCodec ?? 'unknown'}) does not match package codec ${manifest.audioCodec}: ${track.filename}`,
          track.filename,
        ),
      );
    }
  }

  // 4. Integrity: recompute checksums and compare.
  if (await pathExists(path.join(packageDir, CHECKSUMS_FILENAME))) {
    const declared = parseChecksumsFile(
      await readFile(path.join(packageDir, CHECKSUMS_FILENAME), 'utf8'),
    );
    const declaredMap = new Map(declared.map((e) => [e.relativePath, e.sha256]));
    const actual = await calculateChecksums(packageDir);

    for (const entry of actual) {
      const declaredHash = declaredMap.get(entry.relativePath);
      if (declaredHash === undefined) {
        issues.push(
          makeIssue(
            'error',
            'CHECKSUM_MISSING_ENTRY',
            `No checksum entry for ${entry.relativePath}`,
            entry.relativePath,
          ),
        );
      } else if (declaredHash !== entry.sha256) {
        issues.push(
          makeIssue(
            'error',
            'CHECKSUM_MISMATCH',
            `Checksum mismatch for ${entry.relativePath}`,
            entry.relativePath,
          ),
        );
      }
    }
  }

  // Per-track manifest checksums.
  for (const track of manifest.tracks) {
    const trackPath = path.join(packageDir, ...track.filename.split('/'));
    if (await pathExists(trackPath)) {
      const actualHash = await sha256File(trackPath);
      if (actualHash !== track.sha256) {
        issues.push(
          makeIssue(
            'error',
            'CHECKSUM_MISMATCH',
            `Manifest sha256 mismatch for ${track.filename}`,
            track.filename,
          ),
        );
      }
    }
  }

  // 5. Metadata + portability.
  if (!manifest.coverArt) {
    issues.push(makeIssue('warning', 'MISSING_COVER_ART', 'No cover art referenced in manifest'));
  } else if (!(await pathExists(path.join(packageDir, manifest.coverArt)))) {
    issues.push(
      makeIssue('warning', 'COVER_ART_NOT_FOUND', `Cover art not found: ${manifest.coverArt}`, manifest.coverArt),
    );
  }

  for (const rel of await listAllRelPaths(packageDir)) {
    const base = rel.split('/').pop()!;
    if (isOsJunkName(base)) {
      issues.push(makeIssue('warning', 'OS_JUNK_FILE', `OS junk file present: ${rel}`, rel));
    } else if (!isPortableFilename(base)) {
      issues.push(
        makeIssue('warning', 'NON_PORTABLE_FILENAME', `Non-portable filename: ${rel}`, rel),
      );
    }
  }

  // 6. Capacity.
  const totalSize = await totalPackageSize(packageDir);
  const estimate = estimateDiscSize(totalSize, budgetBytes);
  if (estimate.overBudget) {
    issues.push(
      makeIssue(
        options.strict ? 'error' : 'warning',
        'CAPACITY_WARNING',
        `Package size ${totalSize} bytes exceeds media budget ${budgetBytes} bytes`,
      ),
    );
  }

  return finalize(issues);
}

async function listAllRelPaths(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      out.push(...(await listAllRelPaths(abs, base)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

function finalize(issues: ValidationIssue[]): PackageValidationResult {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return { valid: errors.length === 0, issues, errors, warnings };
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10));
  const pb = b.split('.').map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Summary returned by {@link inspectPackage}. */
export interface PackageInspection {
  discId: string;
  artist: string;
  album: string;
  omdFormat: string;
  omdVersion: string;
  audioCodec: string;
  trackCount: number;
  totalDurationSeconds: number;
  totalSizeBytes: number;
  releaseYear?: number;
  coverArt?: string;
  tracks: OmdManifest['tracks'];
  manifest: OmdManifest;
}

/**
 * Read an OMD package's manifest and return a summary. Throws if the manifest
 * is missing or invalid; use {@link validatePackage} for graceful diagnostics.
 */
/** Options for {@link updatePackageMetadata}. */
export interface UpdatePackageMetadataOptions {
  /** The package folder to edit in place. */
  packageDir: string;
  /** New disc title (human `discId`). Omit to leave unchanged. */
  discId?: string;
  /** New artist. Omit to leave unchanged. */
  artist?: string;
  /** New album. Omit to leave unchanged. */
  album?: string;
  /** New release year, or `null` to clear it. Omit to leave unchanged. */
  releaseYear?: number | null;
  /** Track title overrides, matched by track `number`. Omit to leave unchanged. */
  trackTitles?: { number: number; title: string }[];
  /** Absolute path to a replacement cover image (.jpg/.jpeg/.png). */
  coverSourcePath?: string;
  /** Generator identity written to the manifest. */
  generator?: { name: string; version: string };
}

/** Result of {@link updatePackageMetadata}. */
export interface UpdatePackageMetadataResult {
  manifest: OmdManifest;
  validation: PackageValidationResult;
}

/**
 * Edit an existing package's album metadata (and optionally its cover art) in
 * place, then rewrite the manifest and recompute `CHECKSUMS.sha256` so the
 * package stays valid. Audio tracks are never touched.
 */
export async function updatePackageMetadata(
  options: UpdatePackageMetadataOptions,
): Promise<UpdatePackageMetadataResult> {
  const { packageDir } = options;
  const raw = await readFile(path.join(packageDir, MANIFEST_FILENAME), 'utf8');
  const manifest = manifestSchema.parse(JSON.parse(raw));

  if (options.discId !== undefined) manifest.discId = options.discId;
  if (options.artist !== undefined) manifest.artist = options.artist;
  if (options.album !== undefined) manifest.album = options.album;
  if (options.releaseYear === null) {
    delete manifest.releaseYear;
  } else if (options.releaseYear !== undefined) {
    manifest.releaseYear = options.releaseYear;
  }
  if (options.trackTitles && options.trackTitles.length > 0) {
    const byNumber = new Map(options.trackTitles.map((t) => [t.number, t.title]));
    manifest.tracks = manifest.tracks.map((track) => {
      const title = byNumber.get(track.number);
      return title ? { ...track, title } : track;
    });
  }
  if (options.generator) manifest.generator = options.generator;

  // Decide the cover filename (if replacing) and stage it on the manifest, but
  // do NOT touch any files until the whole manifest validates. This guarantees
  // an invalid edit can never leave the package with a dangling cover.
  const previousCover = manifest.coverArt;
  let newCover: string | undefined;
  if (options.coverSourcePath) {
    const ext = path.extname(options.coverSourcePath).toLowerCase() === '.png' ? '.png' : '.jpg';
    newCover = `COVER${ext}`;
    manifest.coverArt = newCover;
  }

  // Validate first (throws on invalid input), before any filesystem mutation.
  const validated = manifestSchema.parse(manifest);

  if (options.coverSourcePath && newCover) {
    if (previousCover && previousCover !== newCover) {
      await rm(path.join(packageDir, previousCover), { force: true });
    }
    await copyFile(options.coverSourcePath, path.join(packageDir, newCover));
  }

  await writeFile(path.join(packageDir, MANIFEST_FILENAME), stringifyManifest(validated), 'utf8');
  const entries = await calculateChecksums(packageDir);
  await writeFile(path.join(packageDir, CHECKSUMS_FILENAME), formatChecksumsFile(entries), 'utf8');

  const validation = await validatePackage(packageDir);
  return { manifest: validated, validation };
}

export async function inspectPackage(packageDir: string): Promise<PackageInspection> {
  const manifestPath = path.join(packageDir, MANIFEST_FILENAME);
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = manifestSchema.parse(JSON.parse(raw));

  return {
    discId: manifest.discId,
    artist: manifest.artist,
    album: manifest.album,
    omdFormat: manifest.omdFormat,
    omdVersion: manifest.omdVersion,
    audioCodec: manifest.audioCodec,
    trackCount: manifest.trackCount,
    totalDurationSeconds: manifest.totalDurationSeconds,
    totalSizeBytes: manifest.totalSizeBytes,
    ...(manifest.releaseYear !== undefined ? { releaseYear: manifest.releaseYear } : {}),
    ...(manifest.coverArt ? { coverArt: manifest.coverArt } : {}),
    tracks: manifest.tracks,
    manifest,
  };
}

/**
 * Return the package's audio track paths in playback (manifest `number`) order.
 * Paths are absolute. Works for a package folder or a mounted disc.
 */
export async function playlistPaths(packageDir: string): Promise<string[]> {
  const { manifest } = await inspectPackage(packageDir);
  return [...manifest.tracks]
    .sort((a, b) => a.number - b.number)
    .map((track) => path.resolve(packageDir, ...track.filename.split('/')));
}
