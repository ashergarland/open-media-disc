import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import {
  OMD_FORMAT,
  OMD_VERSION,
  OutputExistsError,
  burnPackage,
  createPackage,
  resolveBurnBackend,
  slugifyForPath,
} from '@open-album-cartridge/core';
import { buildPackageLabelSheet } from '@open-album-cartridge/label';
import type {
  StudioBurnRequest,
  StudioBurnResult,
  StudioDrive,
  StudioInfo,
  StudioLabel,
  StudioPackageResponse,
  StudioValidationFinding,
} from '../shared/types';

/** OMD Studio app version (independent of the disc format version). */
const STUDIO_VERSION = '0.1.0';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1024,
    height: 720,
    backgroundColor: '#f7fdff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.removeMenu();
  window.once('ready-to-show', () => window.show());
  void window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

ipcMain.handle(
  'omd:info',
  (): StudioInfo => ({
    studioVersion: STUDIO_VERSION,
    omdFormat: OMD_FORMAT,
    omdVersion: OMD_VERSION,
    electron: process.versions.electron ?? 'unknown',
    node: process.versions.node,
  }),
);

ipcMain.handle('omd:listDrives', async (): Promise<StudioDrive[]> => {
  const backend = resolveBurnBackend();
  if (!(await backend.isAvailable())) {
    return [];
  }
  try {
    const drives = await backend.listDrives();
    return drives.map((drive) => ({
      mountPath: drive.mountPath,
      ...(drive.id ? { id: drive.id } : {}),
      ...(drive.description ? { description: drive.description } : {}),
    }));
  } catch {
    return [];
  }
});

function toFinding(issue: {
  severity: string;
  code: string;
  message: string;
  path?: string;
}): StudioValidationFinding {
  return {
    severity: issue.severity as StudioValidationFinding['severity'],
    code: issue.code,
    message: issue.message,
    ...(issue.path ? { path: issue.path } : {}),
  };
}

async function readCoverDataUri(packageDir: string, coverArt?: string): Promise<string | undefined> {
  if (!coverArt) return undefined;
  try {
    const buffer = await readFile(path.join(packageDir, coverArt));
    const mime = coverArt.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return undefined;
  }
}

ipcMain.handle('omd:selectAlbumFolder', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Select an album folder',
    properties: ['openDirectory'],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!;
});

ipcMain.handle(
  'omd:createPackage',
  async (_event, sourceDir: string, overwrite?: boolean): Promise<StudioPackageResponse> => {
    try {
      const { outDir, manifest, validation } = await createPackage({
        sourceDir,
        ...(overwrite ? { overwrite: true } : {}),
        generator: { name: 'OMD Studio', version: STUDIO_VERSION },
      });
      const coverDataUri = await readCoverDataUri(outDir, manifest.coverArt);
      return {
        kind: 'ok',
        outDir,
        discId: manifest.discId,
        artist: manifest.artist,
        album: manifest.album,
        trackCount: manifest.trackCount,
        totalSizeBytes: manifest.totalSizeBytes,
        valid: validation.valid,
        errors: validation.errors.map(toFinding),
        warnings: validation.warnings.map(toFinding),
        tracks: manifest.tracks.map((track) => ({
          number: track.number,
          title: track.title,
          ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
        })),
        ...(coverDataUri ? { coverDataUri } : {}),
      };
    } catch (err) {
      if (err instanceof OutputExistsError) {
        return { kind: 'exists', outDir: err.outDir };
      }
      throw err;
    }
  },
);

ipcMain.handle('omd:buildLabel', async (_event, packageDir: string): Promise<StudioLabel> => {
  const sheet = await buildPackageLabelSheet({ packageDir });
  return { svg: sheet.svg, discId: sheet.discId, artist: sheet.artist, album: sheet.album };
});

ipcMain.handle('omd:saveLabel', async (_event, packageDir: string): Promise<string | null> => {
  const sheet = await buildPackageLabelSheet({ packageDir });
  const result = await dialog.showSaveDialog({
    title: 'Save label sheet',
    defaultPath: `${slugifyForPath(sheet.discId)}-label.svg`,
    filters: [{ name: 'SVG image', extensions: ['svg'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, sheet.svg, 'utf8');
  return result.filePath;
});

ipcMain.handle('omd:burn', async (event, request: StudioBurnRequest): Promise<StudioBurnResult> => {
  try {
    const result = await burnPackage({
      source: request.packageDir,
      drive: { mountPath: request.driveMountPath },
      ...(request.blank !== undefined ? { blank: request.blank } : {}),
      ...(request.verify !== undefined ? { verify: request.verify } : {}),
      ...(request.eject !== undefined ? { eject: request.eject } : {}),
      onProgress: (progress) => event.sender.send('omd:burn:progress', { phase: progress.phase }),
    });
    return {
      ok: request.verify === false ? true : result.verified,
      verified: result.verified,
      blanked: result.blanked,
      ejected: result.ejected,
      backend: result.backend,
      drive: result.drive.mountPath,
    };
  } catch (err) {
    return {
      ok: false,
      verified: false,
      blanked: false,
      ejected: false,
      backend: 'unknown',
      drive: request.driveMountPath,
      error: (err as Error).message,
    };
  }
});

void app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
