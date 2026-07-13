import {
  createPackage,
  formatBytes,
  OutputExistsError,
  type CreatePackageOptions,
  type CreatePackageResult,
} from '@open-album-cartridge/core';
import { createInterface } from 'node:readline/promises';
import { boolOption, intOption, stringOption, type ParsedArgs } from '../args.js';
import { CLI_NAME, CLI_VERSION } from '../version.js';

const USAGE =
  'Usage: omd create <albumFolder> [--out <dir>] [--disc-id <disc title>] [--force]';

/** Ask the user (interactive TTY only) whether to overwrite an existing folder. */
async function confirmOverwrite(outDir: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`Output folder "${outDir}" exists. Overwrite? [y/N] `);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * `omd create <albumFolder> [--out <dir>] [--disc-id <disc title>] [--force]
 *    [--artist ...] [--album ...] [--year 2026]`
 *
 * The disc title (`discId`) defaults to the album title and the output folder
 * defaults to `build/<slugified title>`. Existing output is only replaced with
 * `--force` or an interactive confirmation.
 */
export async function createCommand(args: ParsedArgs): Promise<number> {
  const sourceDir = args.positionals[0];
  if (!sourceDir) {
    console.error(USAGE);
    return 2;
  }

  const options: CreatePackageOptions = {
    sourceDir,
    generator: { name: CLI_NAME, version: CLI_VERSION },
  };
  const discId = stringOption(args, 'disc-id');
  const outDir = stringOption(args, 'out');
  const artist = stringOption(args, 'artist');
  const album = stringOption(args, 'album');
  const year = intOption(args, 'year');
  if (discId) options.discId = discId;
  if (outDir) options.outDir = outDir;
  if (artist) options.artist = artist;
  if (album) options.album = album;
  if (year !== undefined) options.releaseYear = year;
  if (boolOption(args, 'force')) options.overwrite = true;

  let result: CreatePackageResult;
  try {
    result = await createPackage(options);
  } catch (err) {
    if (!(err instanceof OutputExistsError)) throw err;
    if (!(await confirmOverwrite(err.outDir))) {
      console.error(`Aborted: ${err.outDir} already exists. Use --force to overwrite.`);
      return 1;
    }
    result = await createPackage({ ...options, overwrite: true });
  }

  const { manifest, validation } = result;

  console.log(`Created OMD package: ${result.outDir}`);
  console.log(`Disc title: ${manifest.discId}`);
  console.log(`Artist: ${manifest.artist}`);
  console.log(`Album: ${manifest.album}`);
  console.log(`Tracks: ${manifest.trackCount}`);
  console.log(`Audio: ${manifest.audioCodec}`);
  console.log(`Total Size: ${formatBytes(manifest.totalSizeBytes)}`);
  console.log(`Status: ${validation.valid ? 'VALID' : 'INVALID'}`);

  if (validation.warnings.length > 0) {
    console.log('');
    for (const w of validation.warnings) {
      console.log(`  warning [${w.code}] ${w.message}`);
    }
  }
  if (!validation.valid) {
    console.log('');
    for (const e of validation.errors) {
      console.error(`  error [${e.code}] ${e.message}`);
    }
    return 1;
  }
  return 0;
}
