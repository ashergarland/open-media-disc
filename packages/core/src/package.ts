import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { open } from 'node:fs/promises';
import path from 'node:path';
import {
  AUDIO_DIR,
  BOOKLET_FILENAME,
  CHECKSUMS_FILENAME,
  COVER_ART_SOURCE_NAMES,
  DVD_RW_8CM_USABLE_BYTES,
  MANIFEST_FILENAME,
  OMD_VERSION,
} from './constants.js';
import {
  calculateChecksums,
  formatChecksumsFile,
  parseChecksumsFile,
  sha256File,
  totalPackageSize,
} from './checksums.js';
import { estimateDiscSize } from './discSize.js';
import { isFlacBuffer, parseFlacMetadata } from './flac.js';
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
  /** Source album folder containing FLAC files (and optional cover art). */
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
  /** Override artist (else inferred from FLAC tags). */
  artist?: string;
  /** Override album (else inferred from FLAC tags). */
  album?: string;
  /** Override release year (else inferred from FLAC tags). */
  releaseYear?: number;
  /** Capacity budget in bytes. Defaults to the 8cm DVD-RW budget. */
  budgetBytes?: number;
  /** Generator identity written to the manifest. */
  generator?: { name: string; version: string };
  /** Fixed timestamp for deterministic output (tests). Defaults to now. */
  createdAt?: Date;
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
  number: number;
  title: string;
  durationSeconds?: number;
  artist?: string;
  album?: string;
  year?: number;
}

const FLAC_PREFIX_BYTES = 1_048_576; // 1 MiB is plenty for STREAMINFO + tags.

/** Read a bounded prefix of a file for metadata parsing. */
async function readPrefix(filePath: string, length: number): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const size = (await handle.stat()).size;
    const toRead = Math.min(length, size);
    const buf = Buffer.alloc(toRead);
    await handle.read(buf, 0, toRead, 0);
    return buf;
  } finally {
    await handle.close();
  }
}

/** Extract a leading track number from a filename like "01 - Boot.flac". */
function numberFromFilename(name: string): number | undefined {
  const match = /^\s*(\d{1,3})/.exec(name);
  return match ? Number.parseInt(match[1]!, 10) : undefined;
}

/** Derive a track title from a filename by stripping a leading number prefix. */
function titleFromFilename(name: string): string {
  const stem = name.replace(/\.flac$/i, '');
  return stem.replace(/^\s*\d{1,3}\s*[-._)]?\s*/, '').trim() || stem;
}

/**
 * Create a normalized OMD package from a source album folder.
 *
 * Reads FLAC files, infers track order and metadata, copies audio into
 * `AUDIO/`, detects cover art, writes `OMD-MANIFEST.json` and
 * `CHECKSUMS.sha256`, then validates the result.
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
 * (2) any image whose filename hints at cover art, then (3) any image at all —
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

export async function createPackage(options: CreatePackageOptions): Promise<CreatePackageResult> {
  const { sourceDir } = options;
  const budgetBytes = options.budgetBytes ?? DVD_RW_8CM_USABLE_BYTES;
  const generator = options.generator ?? { name: 'OMD Core', version: OMD_VERSION };

  const entries = await readdir(sourceDir, { withFileTypes: true });

  // Collect and describe FLAC source tracks.
  const flacFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.flac'))
    .map((e) => e.name)
    .sort();

  if (flacFiles.length === 0) {
    throw new Error(`No FLAC files found in source folder: ${sourceDir}`);
  }

  const sourceTracks: SourceTrack[] = [];
  let fallbackNumber = 1;
  for (const name of flacFiles) {
    const sourcePath = path.join(sourceDir, name);
    const prefix = await readPrefix(sourcePath, FLAC_PREFIX_BYTES);
    if (!isFlacBuffer(prefix)) {
      throw new Error(`File is not a valid FLAC (bad magic): ${name}`);
    }
    const meta = parseFlacMetadata(prefix);
    const tagNumber = meta.tags['tracknumber']
      ? Number.parseInt(meta.tags['tracknumber']!.split('/')[0]!, 10)
      : undefined;
    const number =
      (Number.isFinite(tagNumber) ? tagNumber : undefined) ??
      numberFromFilename(name) ??
      fallbackNumber;
    fallbackNumber = Math.max(fallbackNumber, number) + 1;

    sourceTracks.push({
      sourcePath,
      number,
      title: meta.tags['title'] ?? titleFromFilename(name),
      durationSeconds: meta.durationSeconds,
      artist: meta.tags['artist'] ?? meta.tags['albumartist'],
      album: meta.tags['album'],
      year: meta.tags['date'] ? Number.parseInt(meta.tags['date']!.slice(0, 4), 10) : undefined,
    });
  }

  sourceTracks.sort((a, b) => a.number - b.number);

  const artist = options.artist ?? sourceTracks.find((t) => t.artist)?.artist ?? 'Unknown Artist';
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

  // Copy audio tracks with normalized, ordered filenames and build track list.
  const tracks: OmdTrack[] = [];
  for (const track of sourceTracks) {
    const padded = track.number.toString().padStart(2, '0');
    const safeTitle = normalizeFilename(track.title);
    const destName = `${padded} - ${safeTitle}.flac`;
    const destPath = path.join(audioOut, destName);
    await copyFile(track.sourcePath, destPath);

    const size = (await stat(destPath)).size;
    const sha256 = await sha256File(destPath);

    tracks.push({
      number: track.number,
      title: track.title,
      filename: `${AUDIO_DIR}/${destName}`,
      ...(track.durationSeconds !== undefined
        ? { durationSeconds: track.durationSeconds }
        : {}),
      sizeBytes: size,
      sha256,
    });
  }

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
  generator?: { name: string; version: string };
  createdAt?: Date;
}

/**
 * Build an OMD package from a curated, ordered list of FLAC tracks pulled from
 * anywhere (e.g. several catalog albums) — a mixtape. Tracks are renumbered
 * 1..N, copied into `AUDIO/`, and a fresh manifest + checksums are written.
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

  const tracks: OmdTrack[] = [];
  let number = 1;
  for (const input of options.tracks) {
    const prefix = await readPrefix(input.sourcePath, FLAC_PREFIX_BYTES);
    if (!isFlacBuffer(prefix)) {
      throw new Error(`File is not a valid FLAC: ${input.sourcePath}`);
    }
    const meta = parseFlacMetadata(prefix);
    const title =
      (input.title ?? meta.tags['title'] ?? titleFromFilename(path.basename(input.sourcePath))).trim() ||
      `Track ${number}`;
    const padded = number.toString().padStart(2, '0');
    const destName = `${padded} - ${normalizeFilename(title)}.flac`;
    const destPath = path.join(audioOut, destName);
    await copyFile(input.sourcePath, destPath);
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
    const prefix = await readPrefix(trackPath, 8);
    if (!isFlacBuffer(prefix)) {
      issues.push(
        makeIssue('error', 'TRACK_NOT_FLAC', `Track is not a FLAC file: ${track.filename}`, track.filename),
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

  // Validate first (throws on invalid input) — before any filesystem mutation.
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
