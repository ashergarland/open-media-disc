import path from 'node:path';
import { runPowerShellScript } from './windowsPowerShell.js';

/** Whether a path is read from a mounted optical disc or an ordinary folder. */
export type MediaKind = 'disc' | 'package';

/**
 * Report the drive type of a drive letter via .NET `DriveInfo`. Returns the enum
 * name (for example `CDRom`, `Fixed`) or `Unknown`. The letter is passed to the
 * constructor, not interpolated into a query.
 */
const DRIVE_TYPE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $di = New-Object System.IO.DriveInfo($env:OMD_DRIVE)
  $di.DriveType.ToString()
} catch { 'Unknown' }
`;

/**
 * Detect whether `targetPath` lives on a mounted optical disc or an ordinary
 * folder. Optical detection is Windows-only (via the drive type); on other
 * platforms, or when the medium cannot be determined, this returns `'package'`
 * rather than guessing `'disc'`.
 */
export async function detectMediaKind(targetPath: string): Promise<MediaKind> {
  if (process.platform !== 'win32') return 'package';

  const root = path.parse(path.resolve(targetPath)).root; // e.g. "D:\"
  const letter = root.replace(/[\\/]+$/, ''); // "D:"
  if (!/^[A-Za-z]:$/.test(letter)) return 'package';

  try {
    const out = await runPowerShellScript(DRIVE_TYPE_SCRIPT, {
      ...process.env,
      OMD_DRIVE: letter,
    });
    return out.trim() === 'CDRom' ? 'disc' : 'package';
  } catch {
    return 'package';
  }
}
