import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron';
import {
  OMD_FORMAT,
  OMD_VERSION,
  OutputExistsError,
  burnPackage,
  createPackage,
  inspectPackage,
  resolveBurnBackend,
  slugifyForPath,
  validatePackage,
} from '@open-album-cartridge/core';
import { buildPackageLabelSheet } from '@open-album-cartridge/label';
import type {
  StudioBurnRequest,
  StudioBurnResult,
  StudioDiscInfo,
  StudioDrive,
  StudioInfo,
  StudioLabel,
  StudioPackageResponse,
  StudioValidationFinding,
  StudioVerifyResult,
} from '../shared/types';

/** OMD Studio app version (independent of the disc format version). */
const STUDIO_VERSION = '0.1.0';

// A privileged custom scheme lets the renderer stream local FLAC files through
// the strict CSP (media-src 'self' omd-audio:), with range support for seeking.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'omd-audio',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
]);

/** Directories whose files omd-audio:// is allowed to serve (opened discs). */
const allowedMediaBases = new Set<string>();

function allowMediaBase(dir: string): void {
  allowedMediaBases.add(path.resolve(dir));
}

function isAllowedMediaPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  for (const base of allowedMediaBases) {
    if (resolved === base || resolved.startsWith(base + path.sep)) return true;
  }
  return false;
}

/** An omd-audio:// URL that streams a local file through the custom protocol. */
function audioUrl(absPath: string): string {
  return `omd-audio://media/?p=${encodeURIComponent(absPath)}`;
}

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

async function buildDiscInfo(source: string): Promise<StudioDiscInfo | null> {
  let inspection;
  try {
    inspection = await inspectPackage(source);
  } catch {
    return null;
  }
  allowMediaBase(source);
  const validation = await validatePackage(source);
  const coverDataUri = await readCoverDataUri(source, inspection.coverArt);
  return {
    source,
    discId: inspection.discId,
    artist: inspection.artist,
    album: inspection.album,
    trackCount: inspection.trackCount,
    totalDurationSeconds: inspection.totalDurationSeconds,
    valid: validation.valid,
    ...(coverDataUri ? { coverDataUri } : {}),
    tracks: inspection.tracks.map((track) => ({
      number: track.number,
      title: track.title,
      ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
      src: audioUrl(path.resolve(source, ...track.filename.split('/'))),
    })),
  };
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

ipcMain.handle('omd:detectDisc', async (): Promise<StudioDiscInfo | null> => {
  const backend = resolveBurnBackend();
  if (!(await backend.isAvailable())) return null;
  let drives: { mountPath: string }[];
  try {
    drives = await backend.listDrives();
  } catch {
    return null;
  }
  for (const drive of drives) {
    const info = await buildDiscInfo(drive.mountPath);
    if (info) return info;
  }
  return null;
});

ipcMain.handle('omd:openPackageFolder', async (): Promise<StudioDiscInfo | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Open an OMD package or disc',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return buildDiscInfo(result.filePaths[0]!);
});

ipcMain.handle('omd:verifyDisc', async (_event, source: string): Promise<StudioVerifyResult> => {
  const validation = await validatePackage(source);
  return { valid: validation.valid, errors: validation.errors.map(toFinding) };
});

ipcMain.handle('omd:openDisc', async (_event, source: string): Promise<StudioDiscInfo | null> => {
  return buildDiscInfo(source);
});

void app.whenReady().then(() => {
  protocol.handle('omd-audio', async (request) => {
    const requested = new URL(request.url).searchParams.get('p');
    if (!requested || !isAllowedMediaPath(requested)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const data = await readFile(requested);
      const lower = requested.toLowerCase();
      const type = lower.endsWith('.flac')
        ? 'audio/flac'
        : lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
            ? 'image/jpeg'
            : 'application/octet-stream';
      const range = request.headers.get('range');
      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        const start = match ? Number(match[1]) : 0;
        const end = match && match[2] ? Number(match[2]) : data.length - 1;
        const chunk = data.subarray(start, end + 1);
        return new Response(chunk, {
          status: 206,
          headers: {
            'Content-Type': type,
            'Content-Range': `bytes ${start}-${end}/${data.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunk.length),
          },
        });
      }
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': type,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(data.length),
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

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
