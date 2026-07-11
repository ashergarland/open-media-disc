import { spawn, spawnSync } from 'node:child_process';
import { formatDuration, inspectPackage, playlistPaths } from '@open-album-cartridge/core';
import { stringOption, type ParsedArgs } from '../args.js';

/** Players tried, in order, when none is forced via --player / OMD_PLAYER. */
const PLAYER_CANDIDATES = ['mpv', 'ffplay'];

/** Whether a player command can be launched in this environment. */
function isPlayerAvailable(command: string): boolean {
  const probe = spawnSync(command, ['--version'], { stdio: 'ignore', windowsHide: true });
  // `error` is set (ENOENT) only when the command itself is not found.
  return !probe.error;
}

/** Resolve a player: an override first, then mpv, then ffplay. */
function resolvePlayer(override: string | undefined): string | undefined {
  const candidates = override ? [override, ...PLAYER_CANDIDATES] : PLAYER_CANDIDATES;
  return candidates.find(isPlayerAvailable);
}

/** Spawn a player and resolve with its exit code. */
function runPlayer(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 0));
  });
}

/** Play a track list with the resolved player. */
async function playWith(command: string, tracks: string[]): Promise<number> {
  const name = command.toLowerCase();

  // ffmpeg's ffplay plays one input at a time, so sequence the tracks.
  if (name.includes('ffplay')) {
    for (const track of tracks) {
      const code = await runPlayer(command, ['-nodisp', '-autoexit', '-loglevel', 'error', track]);
      if (code !== 0) return code;
    }
    return 0;
  }

  // mpv (and unknown players) accept a playlist of files.
  const args = name.includes('mpv') ? ['--no-video', '--quiet', ...tracks] : tracks;
  return runPlayer(command, args);
}

/** `omd play <packageDir> [--player <name>]` */
export async function playCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  if (!packageDir) {
    console.error('Usage: omd play <packageDir> [--player <name>]');
    return 2;
  }

  let info;
  try {
    info = await inspectPackage(packageDir);
  } catch (err) {
    console.error(`Failed to read package: ${(err as Error).message}`);
    return 1;
  }

  console.log(`Now playing: ${info.artist} - ${info.album}`);
  console.log(`(${info.trackCount} tracks, ${formatDuration(info.totalDurationSeconds)})`);
  console.log('');

  const override = stringOption(args, 'player') ?? process.env.OMD_PLAYER;
  const player = resolvePlayer(override);

  if (!player) {
    for (const t of [...info.tracks].sort((a, b) => a.number - b.number)) {
      const dur = t.durationSeconds !== undefined ? formatDuration(t.durationSeconds) : '--:--';
      const num = t.number.toString().padStart(2, '0');
      console.log(`  ${num}. ${t.title}  [${dur}]  ${t.filename}`);
    }
    console.log('');
    console.log('No audio player found (looked for mpv, then ffplay). Showing manifest order.');
    console.log('Install mpv or ffplay, or pass --player <name>, to hear audio.');
    return 0;
  }

  const tracks = await playlistPaths(packageDir);
  console.log(`Playing with ${player}...`);
  try {
    return await playWith(player, tracks);
  } catch (err) {
    console.error(`Playback failed with ${player}: ${(err as Error).message}`);
    return 1;
  }
}
