import {
  ripPackage,
  OutputExistsError,
  type RipMode,
  type RipOptions,
  type RipResult,
} from '@open-media-disc/core';
import { boolOption, stringOption, type ParsedArgs } from '../args.js';
import { confirmOverwrite } from '../prompt.js';

const USAGE =
  'Usage: omd rip <sourceDir|drive> [--out <dir>] [--mode package|album] [--force] [--no-validate]';

/**
 * `omd rip <sourceDir|drive> [--out <dir>] [--mode package|album] [--force]
 *    [--no-validate]`
 *
 * Copy a mounted OMD disc (or any OMD package folder) back to disk, verifying
 * every track against the manifest. `package` mode makes a re-burnable clone;
 * `album` mode makes a friendly listening folder.
 */
export async function ripCommand(args: ParsedArgs): Promise<number> {
  const sourceDir = args.positionals[0];
  if (!sourceDir) {
    console.error(USAGE);
    return 2;
  }

  const modeRaw = stringOption(args, 'mode');
  if (modeRaw !== undefined && modeRaw !== 'package' && modeRaw !== 'album') {
    console.error(`Unknown --mode "${modeRaw}". Use "package" or "album".`);
    return 2;
  }
  const mode = (modeRaw ?? 'package') as RipMode;

  const options: RipOptions = { sourceDir, mode };
  const outDir = stringOption(args, 'out');
  if (outDir) options.outDir = outDir;
  if (boolOption(args, 'force')) options.overwrite = true;
  if (boolOption(args, 'no-validate')) options.validate = false;

  let result: RipResult;
  try {
    result = await ripPackage(options);
  } catch (err) {
    if (err instanceof OutputExistsError) {
      if (!(await confirmOverwrite(err.outDir))) {
        console.error(`Aborted: ${err.outDir} already exists. Use --force to overwrite.`);
        return 1;
      }
      result = await ripPackage({ ...options, overwrite: true });
    } else {
      console.error(`Rip failed: ${(err as Error).message}`);
      return 1;
    }
  }

  const { manifest } = result;
  console.log(`Ripped ${result.mode === 'package' ? 'package clone' : 'album'} to: ${result.outDir}`);
  console.log(`Disc title: ${manifest.discId}`);
  console.log(`Artist: ${manifest.artist}`);
  console.log(`Album: ${manifest.album}`);
  console.log(`Tracks: ${result.filesMatched}/${result.filesTotal} verified`);

  const failed = result.files.filter((f) => !f.matched);
  if (failed.length > 0) {
    console.log('');
    for (const f of failed) {
      console.error(`  mismatch: ${f.filename}`);
    }
  }
  if (result.validation && !result.validation.valid) {
    console.log('');
    for (const e of result.validation.errors) {
      console.error(`  error [${e.code}] ${e.message}`);
    }
  }

  console.log(`Status: ${result.verified ? 'VERIFIED' : 'FAILED'}`);
  return result.verified ? 0 : 1;
}
