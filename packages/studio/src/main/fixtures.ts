/**
 * Fixtures mode wiring (Electron side).
 *
 * Installs the fake optical backends and replaces the handful of IPC channels
 * that would otherwise pop a native dialog or touch hardware, so the app runs
 * fully on the generated {@link FixtureLibrary}. Every other `omd:*` handler is
 * reused unchanged: it already operates on real OMD packages, and the fixtures
 * are real packages.
 */

import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { ipcMain } from 'electron';
import { setBurnBackendOverride, setDiscImageBackendOverride } from '@open-media-disc/core';
import type {
  StudioCoverPick,
  StudioDiscInfo,
  StudioImportScan,
  StudioLabelImage,
} from '../shared/types';
import { FixtureBurnBackend, FixtureDiscImageBackend, type FixtureLibrary } from './fixtureLibrary';

/** Functions the fixtures layer borrows from the main module. */
export interface FixtureDeps {
  /** Build disc info for a package path (reuses the real pipeline + audio protocol). */
  buildDiscInfo(source: string, quick?: boolean): Promise<StudioDiscInfo | null>;
}

/** Replace an existing IPC handler with a fixtures implementation. */
function override(channel: string, handler: (...args: never[]) => unknown): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler as Parameters<typeof ipcMain.handle>[1]);
}

async function coverPick(lib: FixtureLibrary): Promise<StudioCoverPick> {
  const coverPath = path.join(lib.sourceDir, 'cover.png');
  const data = await readFile(coverPath);
  return { path: coverPath, dataUri: `data:image/png;base64,${data.toString('base64')}` };
}

/**
 * Install fixtures mode: point the burn/image backends at fakes and route the
 * dialog/hardware IPC channels to the fixture library.
 */
export function installFixtures(lib: FixtureLibrary, deps: FixtureDeps): void {
  setBurnBackendOverride(new FixtureBurnBackend(lib.discDir));
  setDiscImageBackendOverride(new FixtureDiscImageBackend());

  const ripsDir = path.join(path.dirname(lib.libraryDir), 'rips');

  // Folder pickers resolve to fixture folders instead of opening a native dialog.
  override('omd:chooseLibraryFolder', async (): Promise<string> => lib.libraryDir);
  override('omd:chooseRipDestination', async (): Promise<string> => {
    await mkdir(ripsDir, { recursive: true });
    return ripsDir;
  });
  override('omd:openPackageFolder', async (): Promise<StudioDiscInfo | null> =>
    deps.buildDiscInfo(lib.discDir),
  );
  override('omd:scanImportFolder', async (): Promise<StudioImportScan> => ({
    canceled: false,
    sourceDir: lib.sourceDir,
    albums: [lib.sourceDir],
  }));

  // Image pickers resolve to the fixture cover art.
  override('omd:chooseCoverImage', async (): Promise<StudioCoverPick> => coverPick(lib));
  override('omd:pickLabelImage', async (): Promise<StudioLabelImage> => {
    const pick = await coverPick(lib);
    return { name: 'fixture-cover.png', dataUri: pick.dataUri };
  });

  // Simulate save/print/reveal so automation never blocks on a dialog or shell.
  override('omd:saveLabelSheet', async (): Promise<string> => path.join(ripsDir, 'omd-labels.pdf'));
  override('omd:printLabelSheet', async (): Promise<boolean> => true);
  override('omd:saveLabelSession', async (): Promise<string> =>
    path.join(ripsDir, 'labels.omdsession.json'),
  );
  override('omd:openLabelSession', async (): Promise<null> => null);
  override('omd:revealInFolder', (): void => {
    // No-op in fixtures mode: never open a file explorer during automation.
  });
  override('omd:deletePackage', async (): Promise<void> => {
    // No-op in fixtures mode: protect the generated library from deletion.
  });
}
