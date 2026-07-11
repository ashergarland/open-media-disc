import {
  createPackage,
  formatBytes,
  type CreatePackageOptions,
} from '@open-album-cartridge/core';
import { intOption, stringOption, type ParsedArgs } from '../args.js';
import { CLI_NAME, CLI_VERSION } from '../version.js';

/**
 * `omd create <albumFolder> [--out <dir>] [--disc-id OMD-000001]
 *    [--artist ...] [--album ...] [--year 2026] [--strict]`
 */
export async function createCommand(args: ParsedArgs): Promise<number> {
  const sourceDir = args.positionals[0];
  if (!sourceDir) {
    console.error('Usage: omd create <albumFolder> [--out <dir>] [--disc-id OMD-000001]');
    return 2;
  }

  const discId = stringOption(args, 'disc-id') ?? 'OMD-000001';
  const outDir = stringOption(args, 'out') ?? `./build/${discId}`;

  const options: CreatePackageOptions = {
    sourceDir,
    outDir,
    discId,
    generator: { name: CLI_NAME, version: CLI_VERSION },
  };
  const artist = stringOption(args, 'artist');
  const album = stringOption(args, 'album');
  const year = intOption(args, 'year');
  if (artist) options.artist = artist;
  if (album) options.album = album;
  if (year !== undefined) options.releaseYear = year;

  const { manifest, validation } = await createPackage(options);

  console.log(`Created OMD package: ${outDir}`);
  console.log(`Disc ID: ${manifest.discId}`);
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
