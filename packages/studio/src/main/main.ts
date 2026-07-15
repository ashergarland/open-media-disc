import path from 'node:path';
import { watch } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron';
import {
  OMD_FORMAT,
  OMD_VERSION,
  OutputExistsError,
  burnPackage,
  createPackage,
  inspectPackage,
  resolveBurnBackend,
  validatePackage,
} from '@open-album-cartridge/core';
import { buildPackagesLabelSheet } from '@open-album-cartridge/label';
import type {
  CatalogEntry,
  StudioBurnRequest,
  StudioBurnResult,
  StudioDiscInfo,
  StudioDrive,
  StudioInfo,
  StudioLabelSheetRequest,
  StudioLabelSheetResult,
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

  // Dev-only live reload: when the built renderer files change (run the `watch`
  // script alongside `start`), reload the window so edits appear immediately.
  if (!app.isPackaged) {
    const rendererDir = path.join(__dirname, '..', 'renderer');
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      watch(rendererDir, { recursive: true }, () => {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          if (!window.isDestroyed()) window.webContents.reloadIgnoringCache();
        }, 150);
      });
    } catch {
      // File watching is best-effort; ignore when unavailable.
    }
  }
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

function labelOptions(request: StudioLabelSheetRequest) {
  return {
    packages: request.packages.map((entry) => ({ packageDir: entry.source, copies: entry.copies })),
    ...(request.widthIn !== undefined ? { widthIn: request.widthIn } : {}),
    ...(request.heightIn !== undefined ? { heightIn: request.heightIn } : {}),
    ...(request.fit ? { fit: request.fit } : {}),
  };
}

/** Print a batch of SVG pages through a hidden window at true Letter size. */
async function printSheets(svgPages: string[]): Promise<boolean> {
  if (svgPages.length === 0) return false;
  const body = svgPages
    .map(
      (svg) =>
        `<div class="page"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"/></div>`,
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: Letter; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .page { width: 8.5in; height: 11in; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { display: block; width: 8.5in; height: 11in; }
  </style></head><body>${body}</body></html>`;

  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return await new Promise<boolean>((resolve) => {
      win.webContents.print({ silent: false, printBackground: true }, (success) => resolve(success));
    });
  } finally {
    if (!win.isDestroyed()) win.close();
  }
}

ipcMain.handle(
  'omd:buildLabelSheet',
  async (_event, request: StudioLabelSheetRequest): Promise<StudioLabelSheetResult> => {
    const result = await buildPackagesLabelSheet(labelOptions(request));
    return {
      pages: result.pages.map((page) => page.svg),
      packageCount: result.packageCount,
      labelCount: result.labelCount,
      skipped: result.skipped,
    };
  },
);

ipcMain.handle(
  'omd:saveLabelSheet',
  async (_event, request: StudioLabelSheetRequest): Promise<string | null> => {
    const result = await buildPackagesLabelSheet(labelOptions(request));
    const save = await dialog.showSaveDialog({
      title: 'Save label sheet',
      defaultPath: 'omd-labels.svg',
      filters: [{ name: 'SVG image', extensions: ['svg'] }],
    });
    if (save.canceled || !save.filePath) return null;
    if (result.pages.length === 1) {
      await writeFile(save.filePath, result.pages[0]!.svg, 'utf8');
      return save.filePath;
    }
    const parsed = path.parse(save.filePath);
    const ext = parsed.ext || '.svg';
    let first: string | null = null;
    for (let i = 0; i < result.pages.length; i += 1) {
      const target = path.join(parsed.dir, `${parsed.name}-${i + 1}${ext}`);
      await writeFile(target, result.pages[i]!.svg, 'utf8');
      if (first === null) first = target;
    }
    return first;
  },
);

ipcMain.handle(
  'omd:printLabelSheet',
  async (_event, request: StudioLabelSheetRequest): Promise<boolean> => {
    const result = await buildPackagesLabelSheet(labelOptions(request));
    return printSheets(result.pages.map((page) => page.svg));
  },
);

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

ipcMain.handle('omd:chooseLibraryFolder', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Choose a library folder',
    properties: ['openDirectory'],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!;
});

ipcMain.handle('omd:scanLibrary', async (_event, dir: string): Promise<CatalogEntry[]> => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const catalog: CatalogEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = path.join(dir, entry.name);
    let inspection;
    try {
      inspection = await inspectPackage(source);
    } catch {
      continue;
    }
    const coverDataUri = await readCoverDataUri(source, inspection.coverArt);
    catalog.push({
      source,
      discId: inspection.discId,
      artist: inspection.artist,
      album: inspection.album,
      trackCount: inspection.trackCount,
      ...(coverDataUri ? { coverDataUri } : {}),
    });
  }
  catalog.sort((a, b) => a.discId.localeCompare(b.discId));
  return catalog;
});

ipcMain.handle('omd:revealInFolder', (_event, target: string): void => {
  shell.showItemInFolder(path.resolve(target));
});

ipcMain.handle('omd:importThemeFile', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Import a theme',
    properties: ['openFile'],
    filters: [{ name: 'Theme JSON', extensions: ['json'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    return await readFile(result.filePaths[0]!, 'utf8');
  } catch {
    return null;
  }
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
