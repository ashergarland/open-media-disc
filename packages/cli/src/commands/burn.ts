import {
  burnPackage,
  formatBytes,
  resolveBurnBackend,
  type BurnDrive,
  type BurnProgress,
  type MediaInfo,
} from '@open-media-disc/core';
import { boolOption, stringOption, type ParsedArgs } from '../args.js';

const USAGE =
  'Usage: omd burn <packageDir|imageFile> [--drive <path>] [--label <name>] [--no-blank] [--no-verify] [--no-eject]';

/** Normalize a mount path for comparison (drop trailing slashes, upper-case). */
function normalizeMount(mountPath: string): string {
  return mountPath.replace(/[\\/]+$/, '').toUpperCase();
}

/**
 * A live, single-line phase reporter (spinner + elapsed time) for a burn. On a
 * TTY it animates a spinner; otherwise it prints one line per phase.
 */
function createBurnReporter(): {
  onProgress: (progress: BurnProgress) => void;
  stop: () => void;
} {
  const isTty = Boolean(process.stdout.isTTY);
  const frames = ['-', '\\', '|', '/'];
  let timer: NodeJS.Timeout | undefined;
  let frame = 0;
  let start = 0;
  let label = '';

  const elapsed = (): string => {
    const s = Math.floor((Date.now() - start) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const render = (): void => {
    frame = (frame + 1) % frames.length;
    process.stdout.write(`\r${frames[frame]} ${label}... ${elapsed()}   `);
  };
  const clearLine = (): void => {
    if (isTty && label) {
      process.stdout.write(`\r${' '.repeat(label.length + 24)}\r`);
    }
  };
  const stop = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    clearLine();
    label = '';
  };
  const begin = (next: string): void => {
    stop();
    label = next;
    start = Date.now();
    if (isTty) {
      render();
      timer = setInterval(render, 120);
    } else {
      console.log(`${next}...`);
    }
  };

  return {
    onProgress: (progress: BurnProgress): void => {
      switch (progress.phase) {
        case 'building':
          begin('Building disc image');
          break;
        case 'blanking':
          begin('Blanking disc');
          break;
        case 'writing':
          begin(`Writing${progress.totalBytes ? ` ${formatBytes(progress.totalBytes)}` : ''} to disc`);
          break;
        case 'remounting':
          begin('Remounting disc');
          break;
        case 'verifying':
          begin('Verifying');
          break;
        case 'ejecting':
          begin('Ejecting');
          break;
        default:
          break; // 'probing' is too quick to show
      }
    },
    stop,
  };
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

  // Probe the disc so we can show its type and fail fast on unusable media.
  let media: MediaInfo | undefined;
  if (backend.probeMedia) {
    try {
      media = await backend.probeMedia(drive);
    } catch {
      // Probing is best-effort; fall back to the blank heuristic.
    }
  }

  if (media && !media.present) {
    console.error(`No disc in ${drive.mountPath}. Insert a writable disc and try again.`);
    return 1;
  }

  if (media && media.kind === 'write-once' && !media.blank) {
    console.error(
      `This ${media.typeName ?? 'write-once'} disc already contains data and cannot be ` +
        `erased. Insert a blank disc.`,
    );
    return 1;
  }

  console.log(
    `Burning ${source} to ${drive.mountPath}${drive.description ? ` (${drive.description})` : ''}`,
  );
  if (media) {
    const cap = media.capacityBytes ? `, ${formatBytes(media.capacityBytes)}` : '';
    console.log(
      `Disc: ${media.typeName ?? 'unknown'} (${media.kind}${cap}), ` +
        `${media.blank ? 'blank' : 'not blank'}.`,
    );
    if (blank && media.kind === 'rewritable' && !media.blank) {
      console.log('The rewritable disc will be erased first.');
    }
  } else if (blank) {
    console.log('A non-blank rewritable disc will be erased first.');
  }

  const reporter = createBurnReporter();
  try {
    const result = await burnPackage({
      source,
      drive,
      backend,
      blank,
      verify,
      eject,
      onProgress: reporter.onProgress,
      ...(media ? { media } : {}),
      ...(label ? { volumeLabel: label } : {}),
    });
    reporter.stop();

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
    reporter.stop();
    console.error(`Burn failed: ${(err as Error).message}`);
    return 1;
  }
}
