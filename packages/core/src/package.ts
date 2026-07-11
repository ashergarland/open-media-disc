import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
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
  /** Destination package folder. Created if missing. */
  outDir: string;
  /** Disc ID such as `OMD-000001`. Required for a stable, labelable object. */
  discId: string;
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
export async function createPackage(options: CreatePackageOptions): Promise<CreatePackageResult> {
  const { sourceDir, outDir, discId } = options;
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

  // Detect and copy cover art.
  let coverArt: string | undefined;
  for (const candidate of COVER_ART_SOURCE_NAMES) {
    const found = entries.find((e) => e.isFile() && e.name.toLowerCase() === candidate);
    if (found) {
      const ext = path.extname(found.name).toLowerCase() === '.png' ? '.png' : '.jpg';
      coverArt = `COVER${ext}`;
      await copyFile(path.join(sourceDir, found.name), path.join(outDir, coverArt));
      break;
    }
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
 * is missing or invalid — use {@link validatePackage} for graceful diagnostics.
 */
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
