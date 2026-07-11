import {
  inspectPackage,
  validatePackage,
  type ValidatePackageOptions,
} from '@open-album-cartridge/core';
import { boolOption, type ParsedArgs } from '../args.js';

/** `omd validate <packageDir> [--strict]` */
export async function validateCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  if (!packageDir) {
    console.error('Usage: omd validate <packageDir> [--strict]');
    return 2;
  }

  const options: ValidatePackageOptions = {};
  if (boolOption(args, 'strict')) options.strict = true;

  const result = await validatePackage(packageDir, options);

  console.log(`OMD Package: ${result.valid ? 'VALID' : 'INVALID'}`);
  console.log('');

  // Print album summary when the manifest is readable.
  try {
    const info = await inspectPackage(packageDir);
    const checksumOk = !result.issues.some(
      (i) => i.code === 'CHECKSUM_MISMATCH' || i.code === 'CHECKSUM_MISSING_ENTRY',
    );
    console.log(`Disc ID: ${info.discId}`);
    console.log(`Artist: ${info.artist}`);
    console.log(`Album: ${info.album}`);
    console.log(`Format: ${info.omdFormat} v${info.omdVersion}`);
    console.log(`Tracks: ${info.trackCount}`);
    console.log(`Audio: ${info.audioCodec}`);
    console.log(`Checksums: ${checksumOk ? 'PASS' : 'FAIL'}`);
  } catch {
    // Manifest unreadable; issues below explain why.
  }

  if (result.warnings.length > 0) {
    console.log('');
    for (const w of result.warnings) {
      console.log(`  warning [${w.code}] ${w.message}`);
    }
  }
  if (result.errors.length > 0) {
    console.log('');
    for (const e of result.errors) {
      console.error(`  error [${e.code}] ${e.message}`);
    }
  }

  return result.valid ? 0 : 1;
}
