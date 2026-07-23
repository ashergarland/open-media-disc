import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { CHECKSUMS_FILENAME, MANIFEST_FILENAME } from './constants.js';
import { sha256File } from './checksums.js';
import { slugifyForPath } from './discTitle.js';
import type { OmdManifest } from './manifest.js';
import { inspectPackage, OutputExistsError, validatePackage } from './package.js';
import type { PackageValidationResult } from './validationTypes.js';

/** How a disc is copied back to disk. */
export type RipMode = 'package' | 'album';

/** Options for {@link ripPackage}. */
export interface RipOptions {
  /** Source OMD package directory, or a mounted disc's mount path. */
  sourceDir: string;
  /** Destination directory. Defaults to `build/<slugified disc title>`. */
  outDir?: string;
  /**
   * `package` (default): a byte-faithful, re-burnable clone of the whole tree.
   * `album`: a friendly listening folder (FLAC tracks and cover art only).
   */
  mode?: RipMode;
  /** Overwrite the output folder if it already exists. Defaults to `false`. */
  overwrite?: boolean;
  /** Validate the source before ripping. Defaults to `true`. */
  validate?: boolean;
  /** Optional progress callback, for a UI progress bar. */
  onProgress?: (progress: RipProgress) => void;
}

/** Progress of {@link ripPackage}, for a UI progress bar. */
export interface RipProgress {
  /** 'validating' the source, 'copying' each track, or 'finalizing' the clone. */
  phase: 'validating' | 'copying' | 'finalizing';
  /** Tracks copied so far (during the 'copying' phase). */
  done: number;
  /** Total tracks to copy. */
  total: number;
}

/** Per-track result of a rip: the copied file and whether it verified. */
export interface RippedFile {
  /** Path relative to the output directory. */
  filename: string;
  /** SHA-256 of the copied file. */
  sha256: string;
  /** True when the copy matches the manifest's recorded hash. */
  matched: boolean;
}

/** Result of {@link ripPackage}. */
export interface RipResult {
  outDir: string;
  mode: RipMode;
  manifest: OmdManifest;
  /** One entry per audio track, in manifest order. */
  files: RippedFile[];
  filesMatched: number;
  filesTotal: number;
  /** True when every track verified (and, in package mode, the clone re-validates). */
  verified: boolean;
  /** Present in `package` mode: full re-validation of the ripped clone. */
  validation?: PackageValidationResult;
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
 * Copy a mounted OMD disc (or any OMD package folder) to disk, verifying every
 * track against the manifest so the result is a certified copy.
 *
 * This is a verified file copy, not audio re-encoding: OMD stores FLAC files in
 * a UDF filesystem, so ripping reproduces those exact files. `package` mode
 * reproduces the whole tree (manifest, audio, checksums, art) as a re-burnable
 * clone and re-validates it; `album` mode writes only the FLAC tracks and cover
 * art as a friendly listening folder.
 */
export async function ripPackage(options: RipOptions): Promise<RipResult> {
  const { sourceDir } = options;
  const mode: RipMode = options.mode ?? 'package';

  // Confirm the source is a readable OMD package and read its manifest.
  const { manifest } = await inspectPackage(sourceDir);

  // A rip must start from an intact source unless the caller opts out.
  if (options.validate !== false) {
    options.onProgress?.({ phase: 'validating', done: 0, total: manifest.tracks.length });
    const sourceValidation = await validatePackage(sourceDir);
    if (!sourceValidation.valid) {
      const detail = sourceValidation.errors.map((e) => `[${e.code}] ${e.message}`).join('; ');
      throw new Error(`Cannot rip an invalid OMD package: ${detail}`);
    }
  }

  const outDir = options.outDir ?? path.join('build', slugifyForPath(manifest.discId));

  // Refuse to clobber an existing output unless the caller opts in.
  if (await pathExists(outDir)) {
    if (!options.overwrite) {
      throw new OutputExistsError(outDir);
    }
    await rm(outDir, { recursive: true, force: true });
  }
  await mkdir(outDir, { recursive: true });

  const tracks = [...manifest.tracks].sort((a, b) => a.number - b.number);
  const files: RippedFile[] = [];

  let copied = 0;
  for (const track of tracks) {
    options.onProgress?.({ phase: 'copying', done: copied, total: tracks.length });
    const segments = track.filename.split('/');
    const srcPath = path.join(sourceDir, ...segments);
    // package mode keeps the AUDIO/ layout; album mode flattens to the basename.
    const relPath = mode === 'package' ? track.filename : segments[segments.length - 1]!;
    const destPath = path.join(outDir, ...relPath.split('/'));
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyFile(srcPath, destPath);
    const digest = await sha256File(destPath);
    files.push({ filename: relPath, sha256: digest, matched: digest === track.sha256 });
    copied += 1;
  }

  options.onProgress?.({ phase: 'finalizing', done: tracks.length, total: tracks.length });

  // Cover art travels with both modes. A full clone also carries the manifest,
  // checksums, and booklet so the output re-validates and can be re-burned.
  if (manifest.coverArt) {
    await copyFile(path.join(sourceDir, manifest.coverArt), path.join(outDir, manifest.coverArt));
  }
  if (mode === 'package') {
    await copyFile(path.join(sourceDir, MANIFEST_FILENAME), path.join(outDir, MANIFEST_FILENAME));
    await copyFile(path.join(sourceDir, CHECKSUMS_FILENAME), path.join(outDir, CHECKSUMS_FILENAME));
    if (manifest.booklet) {
      await copyFile(path.join(sourceDir, manifest.booklet), path.join(outDir, manifest.booklet));
    }
  }

  const filesMatched = files.filter((f) => f.matched).length;
  const filesTotal = files.length;

  let validation: PackageValidationResult | undefined;
  let verified: boolean;
  if (mode === 'package') {
    validation = await validatePackage(outDir);
    verified = validation.valid && filesMatched === filesTotal;
  } else {
    verified = filesMatched === filesTotal;
  }

  return {
    outDir,
    mode,
    manifest,
    files,
    filesMatched,
    filesTotal,
    verified,
    ...(validation ? { validation } : {}),
  };
}
