import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CHECKSUMS_FILENAME,
  calculateChecksums,
  formatChecksumsFile,
  parseChecksumsFile,
} from '@open-album-cartridge/core';
import { readFile } from 'node:fs/promises';
import { boolOption, type ParsedArgs } from '../args.js';

/**
 * `omd checksum <packageDir> [--write]`
 *
 * Without `--write`, recomputes and verifies checksums against the existing
 * `CHECKSUMS.sha256`. With `--write`, (re)generates the checksums file.
 */
export async function checksumCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  if (!packageDir) {
    console.error('Usage: omd checksum <packageDir> [--write]');
    return 2;
  }

  const entries = await calculateChecksums(packageDir);

  if (boolOption(args, 'write')) {
    await writeFile(
      path.join(packageDir, CHECKSUMS_FILENAME),
      formatChecksumsFile(entries),
      'utf8',
    );
    console.log(`Wrote ${CHECKSUMS_FILENAME} (${entries.length} files)`);
    return 0;
  }

  // Verify against existing file.
  let declared;
  try {
    declared = parseChecksumsFile(
      await readFile(path.join(packageDir, CHECKSUMS_FILENAME), 'utf8'),
    );
  } catch {
    console.error(`Missing ${CHECKSUMS_FILENAME}. Run with --write to generate it.`);
    return 1;
  }

  const declaredMap = new Map(declared.map((e) => [e.relativePath, e.sha256]));
  let mismatches = 0;
  for (const entry of entries) {
    const expected = declaredMap.get(entry.relativePath);
    if (expected === undefined) {
      console.error(`  MISSING ENTRY  ${entry.relativePath}`);
      mismatches += 1;
    } else if (expected !== entry.sha256) {
      console.error(`  MISMATCH       ${entry.relativePath}`);
      mismatches += 1;
    } else {
      console.log(`  OK             ${entry.relativePath}`);
    }
  }

  console.log('');
  if (mismatches === 0) {
    console.log(`Checksums: PASS (${entries.length} files)`);
    return 0;
  }
  console.error(`Checksums: FAIL (${mismatches} problem(s))`);
  return 1;
}
