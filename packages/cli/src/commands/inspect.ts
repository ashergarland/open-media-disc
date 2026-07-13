import {
  detectMediaKind,
  estimateDiscSize,
  formatBytes,
  formatDuration,
  inspectPackage,
} from '@open-album-cartridge/core';
import type { ParsedArgs } from '../args.js';

/** `omd inspect <packageDir>` */
export async function inspectCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  if (!packageDir) {
    console.error('Usage: omd inspect <packageDir>');
    return 2;
  }

  let info;
  try {
    info = await inspectPackage(packageDir);
  } catch (err) {
    console.error(`Failed to inspect package: ${(err as Error).message}`);
    return 1;
  }

  const size = estimateDiscSize(info.totalSizeBytes);
  const kind = await detectMediaKind(packageDir);

  console.log(kind === 'disc' ? 'OMD Disc' : 'OMD Package (folder)');
  console.log(`Disc title: ${info.discId}`);
  console.log(`Artist: ${info.artist}`);
  console.log(`Album: ${info.album}`);
  if (info.releaseYear !== undefined) console.log(`Year: ${info.releaseYear}`);
  console.log(`Format: ${info.omdFormat} v${info.omdVersion}`);
  console.log(`Tracks: ${info.trackCount}`);
  console.log(`Duration: ${formatDuration(info.totalDurationSeconds)}`);
  console.log(`Size: ${formatBytes(info.totalSizeBytes)}`);
  console.log(
    `Media budget: ${formatBytes(size.budgetBytes)} (${Math.round(size.usedFraction * 100)}% used${
      size.overBudget ? ', OVER BUDGET' : ''
    })`,
  );
  console.log('');
  console.log('Tracks:');
  for (const t of info.tracks) {
    const dur = t.durationSeconds !== undefined ? formatDuration(t.durationSeconds) : '--:--';
    const num = t.number.toString().padStart(2, '0');
    console.log(`  ${num}. ${t.title}  [${dur}]`);
  }

  return 0;
}
