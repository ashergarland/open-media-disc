import { formatDuration, inspectPackage } from '@open-album-cartridge/core';
import type { ParsedArgs } from '../args.js';

/**
 * `omd play <packageDir>`
 *
 * v0.1 stub: OMD Core does not bundle an audio backend. This command reads the
 * manifest and shows what a player would present, in manifest order. Real
 * playback belongs in a player app or the OMD Pi Player hardware stack.
 */
export async function playCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  if (!packageDir) {
    console.error('Usage: omd play <packageDir>');
    return 2;
  }

  let info;
  try {
    info = await inspectPackage(packageDir);
  } catch (err) {
    console.error(`Failed to read package: ${(err as Error).message}`);
    return 1;
  }

  console.log(`Now playing: ${info.artist} — ${info.album}`);
  console.log(`(${info.trackCount} tracks, ${formatDuration(info.totalDurationSeconds)})`);
  console.log('');
  for (const t of info.tracks) {
    const dur = t.durationSeconds !== undefined ? formatDuration(t.durationSeconds) : '--:--';
    const num = t.number.toString().padStart(2, '0');
    console.log(`  ▶ ${num}. ${t.title}  [${dur}]  ${t.filename}`);
  }
  console.log('');
  console.log('Note: OMD Core v0.1 does not include audio output. This is a manifest-order');
  console.log('preview. Use a dedicated OMD player app or hardware to hear audio.');

  return 0;
}
