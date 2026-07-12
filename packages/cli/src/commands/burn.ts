import { burnPackage, resolveBurnBackend, type BurnDrive } from '@open-album-cartridge/core';
import { boolOption, stringOption, type ParsedArgs } from '../args.js';

const USAGE =
  'Usage: omd burn <packageDir|imageFile> [--drive <path>] [--label <name>] [--no-blank] [--no-verify] [--no-eject]';

/** Normalize a mount path for comparison (drop trailing slashes, upper-case). */
function normalizeMount(mountPath: string): string {
  return mountPath.replace(/[\\/]+$/, '').toUpperCase();
}

/**
 * `omd burn <packageDir|imageFile> [--drive <path>] [--label <name>]
 *    [--no-blank] [--no-verify] [--no-eject]`
 */
export async function burnCommand(args: ParsedArgs): Promise<number> {
  const source = args.positionals[0];
  if (!source) {
    console.error(USAGE);
    return 2;
  }

  const backend = resolveBurnBackend();
  if (!(await backend.isAvailable())) {
    console.error(
      `Burning requires Windows (IMAPI2) with a writer attached. ` +
        `Backend "${backend.name}" is not available here.`,
    );
    return 1;
  }

  let drives: BurnDrive[];
  try {
    drives = await backend.listDrives();
  } catch (err) {
    console.error(`Failed to list optical drives: ${(err as Error).message}`);
    return 1;
  }
  if (drives.length === 0) {
    console.error('No writable optical drive found.');
    return 1;
  }

  const wanted = stringOption(args, 'drive');
  let drive: BurnDrive;
  if (wanted) {
    const match = drives.find((d) => normalizeMount(d.mountPath) === normalizeMount(wanted));
    if (!match) {
      console.error(
        `Drive "${wanted}" not found. Available: ${drives.map((d) => d.mountPath).join(', ')}`,
      );
      return 1;
    }
    drive = match;
  } else if (drives.length === 1) {
    drive = drives[0]!;
  } else {
    console.error(
      `Multiple drives found; choose one with --drive. Available: ${drives
        .map((d) => d.mountPath)
        .join(', ')}`,
    );
    return 1;
  }

  const label = stringOption(args, 'label');
  const blank = !boolOption(args, 'no-blank');
  const verify = !boolOption(args, 'no-verify');
  const eject = !boolOption(args, 'no-eject');

  console.log(
    `Burning ${source} to ${drive.mountPath}${drive.description ? ` (${drive.description})` : ''}`,
  );
  if (blank) {
    console.log('A non-blank rewritable disc will be erased first.');
  }

  try {
    const result = await burnPackage({
      source,
      drive,
      backend,
      blank,
      verify,
      eject,
      ...(label ? { volumeLabel: label } : {}),
    });

    if (result.blanked) {
      console.log('Disc blanked.');
    }
    console.log(`Wrote image to ${result.drive.mountPath}.`);

    const discState = result.ejected ? 'Disc ejected.' : 'Disc left in drive.';

    if (!verify) {
      console.log('Burn complete (verification skipped).');
      console.log(discState);
      return 0;
    }
    if (result.verified) {
      console.log('Verification: PASS');
      console.log('Burn complete.');
      console.log(discState);
      return 0;
    }
    console.error('Verification: FAIL');
    if (result.verification) {
      for (const e of result.verification.errors) {
        console.error(`  error [${e.code}] ${e.message}`);
      }
    }
    console.error('Disc left in drive for inspection.');
    return 1;
  } catch (err) {
    console.error(`Burn failed: ${(err as Error).message}`);
    return 1;
  }
}
