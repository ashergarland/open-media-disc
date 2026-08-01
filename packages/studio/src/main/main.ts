import path from 'node:path';
import os from 'node:os';
import { watch } from 'node:fs';
import { access, mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron';
import {
  ALL_AUDIO_EXTENSIONS,
  AUDIO_CODEC_MIME,
  DEFAULT_AUDIO_CODEC,
  LOSSLESS_CODECS,
  OMD_FORMAT,
  OMD_VERSION,
  OutputExistsError,
  burnPackage,
  codecForExtension,
  createMixtape,
  createPackage,
  inspectPackage,
  inspectSourceAlbum,
  readAudioMeta,
  resolveBurnBackend,
  ripPackage,
  slugifyForPath,
  updatePackageMetadata,
  validatePackage,
  type MediaInfo,
} from '@open-media-disc/core';
import {
  BUILTIN_LABEL_TEMPLATES,
  buildPackagesLabelSheet,
  getLabelTemplate,
} from '@open-media-disc/label';
import ffmpegStatic from 'ffmpeg-static';
import { parseRuntimeConfig } from './config';
import { ensureFixtureLibrary } from './fixtureLibrary';
import { installFixtures } from './fixtures';
import { runScreenshotHarness } from './harness';

/**
 * Absolute path to the bundled ffmpeg binary (from `ffmpeg-static`), used to
 * transcode imported audio to a single package codec. Null if unavailable.
 */
const FFMPEG_PATH: string | null = (ffmpegStatic as unknown as string | null) ?? null;

/** Bundled default cover art used for mixtapes when the user picks none. */
const DEFAULT_MIXTAPE_COVER = path.join(__dirname, '..', 'renderer', 'assets', 'mixtape-default-cover.png');
import type {
  CatalogEntry,
  StudioBootConfig,
  StudioBurnRequest,
  StudioBurnResult,
  StudioCoverPick,
  StudioDiscInfo,
  StudioDrive,
  StudioImportRequest,
  StudioImportScan,
  StudioSourceDraft,
  StudioInfo,
  StudioLabelImage,
  StudioLabelSession,
  StudioLabelSheetRequest,
  StudioLabelSheetResult,
  StudioLabelTemplate,
  StudioMixtapeAlbum,
  StudioMixtapeRequest,
  StudioRipRequest,
  StudioRipResult,
  StudioUpdateRequest,
  StudioValidationFinding,
  StudioVerifyResult,
} from '../shared/types';

/** OMD Studio app version (independent of the disc format version). */
const STUDIO_VERSION = '0.1.0';

/** Runtime configuration (data mode, headless capture) from flags and env. */
const runtimeConfig = parseRuntimeConfig(process.argv, process.env);

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
    if (resolved === base) return true;
    // A disc mounted at a drive root (e.g. "D:\\") already ends with the
    // separator; don't append a second one or child paths never match.
    const prefix = base.endsWith(path.sep) ? base : base + path.sep;
    if (resolved.startsWith(prefix)) return true;
  }
  return false;
}

/** An omd-audio:// URL that streams a local file through the custom protocol. */
function audioUrl(absPath: string): string {
  return `omd-audio://media/?p=${encodeURIComponent(absPath)}`;
}

/** Serialize the renderer boot config for delivery through the preload bridge. */
function encodeBootConfig(boot: StudioBootConfig): string {
  return `--omd-studio-config=${Buffer.from(JSON.stringify(boot), 'utf8').toString('base64')}`;
}

function createWindow(
  boot: StudioBootConfig,
  headless: boolean,
  size: { width: number; height: number },
  kiosk: boolean,
): BrowserWindow {
  const window = new BrowserWindow({
    // Content size, so --omd-size is the CSS viewport the layout actually sees.
    useContentSize: true,
    width: size.width,
    height: size.height,
    // Below this the fit-to-viewport layouts stop being usable; it is under the
    // 7 inch Pi panel (800x480) and a portrait phone width, which both work.
    minWidth: 420,
    minHeight: 380,
    backgroundColor: '#0d131e',
    show: false,
    // Appliance mode: no chrome, no menu, full screen, not casually exitable.
    kiosk,
    fullscreen: kiosk,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [encodeBootConfig(boot)],
    },
  });

  window.removeMenu();
  // A visible window is only shown for a normal interactive session; the
  // headless screenshot harness captures the hidden window off-screen. Kiosk
  // is already full-screen, so only a desktop window is maximized.
  if (!headless) {
    window.once('ready-to-show', () => {
      if (!kiosk) window.maximize();
      window.show();
    });
  }
  void window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Watch the optical drives so the Disc view reflects inserts/ejects live.
  startDiscWatch(window);

  // Dev-only live reload: when the built renderer files change (run the `watch`
  // script alongside `start`), reload the window so edits appear immediately.
  // Disabled headless so a reload never races a screenshot capture.
  if (!app.isPackaged && !headless) {
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
  return window;
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

/** Audio codec + bit depth + sample rate, read from the first track's header. */
async function audioInfo(
  source: string,
  inspection: { audioCodec: string; tracks: { filename: string }[] },
): Promise<{ codec: string; bitDepth?: number; sampleRate?: number; bitrate?: number; lossless: boolean }> {
  const codec = inspection.audioCodec || DEFAULT_AUDIO_CODEC;
  const lossless = (LOSSLESS_CODECS as readonly string[]).includes(codec);
  const first = inspection.tracks[0];
  if (!first) return { codec, lossless };
  try {
    const filePath = path.resolve(source, ...first.filename.split('/'));
    const meta = await readAudioMeta(filePath);
    return {
      codec,
      lossless,
      ...(meta.bitsPerSample ? { bitDepth: meta.bitsPerSample } : {}),
      ...(meta.sampleRate ? { sampleRate: meta.sampleRate } : {}),
      ...(meta.bitrate ? { bitrate: Math.round(meta.bitrate) } : {}),
    };
  } catch {
    return { codec, lossless };
  }
}

/** Infer the physical disc size band from its capacity, e.g. "8cm mini". */
function discSizeLabel(typeName: string, capacityBytes?: number): string {
  if (!capacityBytes) return '';
  const type = typeName.toUpperCase();
  if (type.includes('BD')) return capacityBytes < 15e9 ? '8cm mini' : '';
  if (type.includes('DVD')) return capacityBytes < 3.5e9 ? '8cm mini' : '';
  if (type.includes('CD')) return capacityBytes < 400e6 ? '8cm mini' : '';
  return '';
}

/** A display label for a probed disc, e.g. "8cm mini DVD-RW" or "Unknown disc". */
function describeDisc(media: MediaInfo): string {
  if (!media.typeName) return 'Unknown disc';
  const size = discSizeLabel(media.typeName, media.capacityBytes);
  return size ? `${size} ${media.typeName}` : media.typeName;
}

async function buildDiscInfo(source: string, quick = false): Promise<StudioDiscInfo | null> {
  let inspection;
  try {
    inspection = await inspectPackage(source);
  } catch {
    return null;
  }
  allowMediaBase(source);
  // Full validation rehashes every FLAC, which is slow on a spinning optical
  // disc. In quick mode (live detection) we skip it and let the renderer verify
  // in the background so the disc appears immediately.
  const valid = quick ? false : (await validatePackage(source)).valid;
  const coverDataUri = await readCoverDataUri(source, inspection.coverArt);
  const audio = await audioInfo(source, inspection);
  return {
    source,
    discId: inspection.discId,
    artist: inspection.artist,
    album: inspection.album,
    trackCount: inspection.trackCount,
    totalDurationSeconds: inspection.totalDurationSeconds,
    totalSizeBytes: inspection.totalSizeBytes,
    valid,
    audioCodec: audio.codec,
    audioLossless: audio.lossless,
    ...(audio.bitDepth !== undefined ? { audioBitDepth: audio.bitDepth } : {}),
    ...(audio.sampleRate !== undefined ? { audioSampleRate: audio.sampleRate } : {}),
    ...(audio.bitrate !== undefined ? { audioBitrate: audio.bitrate } : {}),
    ...(inspection.releaseYear !== undefined ? { releaseYear: inspection.releaseYear } : {}),
    ...(coverDataUri ? { coverDataUri } : {}),
    tracks: inspection.tracks.map((track) => ({
      number: track.number,
      title: track.title,
      ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
      src: audioUrl(path.resolve(source, ...track.filename.split('/'))),
    })),
  };
}

/** Detect an OMD disc in any optical drive, enriched with probed media info. */
async function detectOmdDisc(): Promise<StudioDiscInfo | null> {
  const backend = resolveBurnBackend();
  if (!(await backend.isAvailable())) return null;
  let drives;
  try {
    drives = await backend.listDrives();
  } catch {
    return null;
  }
  for (const drive of drives) {
    const info = await buildDiscInfo(drive.mountPath, true);
    if (!info) continue;
    if (backend.probeMedia) {
      try {
        const media = await backend.probeMedia(drive);
        return {
          ...info,
          discFormat: describeDisc(media),
          ...(media.typeName ? { discMediaType: media.typeName } : {}),
          ...(media.kind !== 'unknown' ? { discRewritable: media.kind === 'rewritable' } : {}),
          ...(media.capacityBytes ? { discCapacityBytes: media.capacityBytes } : {}),
        };
      } catch {
        // Fall through to content-only info when the media can't be probed.
      }
    }
    return info;
  }
  return null;
}

/**
 * A cheap signature of what OMD media is currently present, so the watcher can
 * tell an insert/eject apart from a poll where nothing changed. It only checks
 * for the manifest file at each drive root (no full package read).
 */
async function discPresenceSignature(): Promise<string> {
  const backend = resolveBurnBackend();
  if (!(await backend.isAvailable())) return 'none';
  let drives;
  try {
    drives = await backend.listDrives();
  } catch {
    return 'none';
  }
  const parts: string[] = [];
  for (const drive of drives) {
    try {
      await access(path.join(drive.mountPath, 'OMD-MANIFEST.json'));
      parts.push(`${drive.mountPath}:omd`);
    } catch {
      parts.push(`${drive.mountPath}:empty`);
    }
  }
  return parts.length > 0 ? parts.join('|') : 'none';
}

/**
 * Poll the optical drives and push `omd:discChanged` to the renderer whenever
 * OMD media appears or disappears, so the Disc view reflects the physical disc
 * without the user pressing Detect.
 */
function startDiscWatch(window: BrowserWindow): void {
  let lastSignature: string | undefined;
  let busy = false;
  const tick = async (): Promise<void> => {
    if (busy || window.isDestroyed()) return;
    busy = true;
    try {
      const signature = await discPresenceSignature();
      if (signature !== lastSignature) {
        lastSignature = signature;
        const disc = await detectOmdDisc();
        if (!window.isDestroyed()) window.webContents.send('omd:discChanged', disc);
      }
    } catch {
      // Best-effort polling; ignore transient drive errors.
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 1500);
  window.on('closed', () => clearInterval(timer));
  void tick();
}

function labelOptions(request: StudioLabelSheetRequest) {
  const template = request.templateId ? getLabelTemplate(request.templateId) : undefined;
  return {
    packages: request.packages.map((entry) => ({ packageDir: entry.source, copies: entry.copies })),
    ...(template ? { template } : {}),
    ...(request.fit ? { fit: request.fit } : {}),
    ...(request.customImages && request.customImages.length
      ? { extraCovers: request.customImages.map((img) => ({ imageHref: img.imageHref, copies: img.copies })) }
      : {}),
  };
}

/** MIME type for a cover/label image path, or null if unsupported. */
function imageMime(filePath: string): string | null {
  switch (path.extname(filePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
    case '.jfif':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    default:
      return null;
  }
}

/** Build a self-contained HTML page holding each SVG sheet at true physical size. */
function sheetHtml(svgPages: string[], page: { widthIn: number; heightIn: number }): string {
  const w = `${page.widthIn}in`;
  const h = `${page.heightIn}in`;
  const body = svgPages
    .map(
      (svg) =>
        `<div class="page"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"/></div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${w} ${h}; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .page { width: ${w}; height: ${h}; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { display: block; width: ${w}; height: ${h}; }
  </style></head><body>${body}</body></html>`;
}

/**
 * Render the sheet HTML in a hidden window and hand it to `fn`. Loads from a temp
 * file, not a data: URL: the embedded SVG pages exceed Chromium's navigation
 * length limit (ERR_INVALID_URL).
 */
async function withSheetWindow<T>(
  svgPages: string[],
  page: { widthIn: number; heightIn: number },
  fn: (win: BrowserWindow) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'omd-print-'));
  const file = path.join(dir, 'sheet.html');
  await writeFile(file, sheetHtml(svgPages, page), 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await win.loadFile(file);
    return await fn(win);
  } finally {
    if (!win.isDestroyed()) win.close();
    await rm(dir, { recursive: true, force: true });
  }
}

/** Print a batch of SVG pages through a hidden window at true physical size. */
async function printSheets(
  svgPages: string[],
  page: { widthIn: number; heightIn: number },
): Promise<boolean> {
  if (svgPages.length === 0) return false;
  return withSheetWindow(
    svgPages,
    page,
    (win) =>
      new Promise<boolean>((resolve) => {
        win.webContents.print({ silent: false, printBackground: true }, (success) => resolve(success));
      }),
  );
}

/** Render a batch of SVG pages to a print-ready PDF at true physical size. */
async function sheetsToPdf(
  svgPages: string[],
  page: { widthIn: number; heightIn: number },
): Promise<Buffer | null> {
  if (svgPages.length === 0) return null;
  return withSheetWindow(svgPages, page, (win) =>
    win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true }),
  );
}

ipcMain.handle('omd:labelTemplates', (): StudioLabelTemplate[] =>
  BUILTIN_LABEL_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    shape: template.shape,
  })),
);

ipcMain.handle('omd:pickLabelImage', async (): Promise<StudioLabelImage | null> => {
  const pick = await dialog.showOpenDialog({
    title: 'Add an image to the label sheet',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  if (pick.canceled || pick.filePaths.length === 0) return null;
  const filePath = pick.filePaths[0]!;
  const mime = imageMime(filePath);
  if (!mime) throw new Error('Unsupported image type. Use JPG, PNG, WebP, GIF, or BMP.');
  const bytes = await readFile(filePath);
  return { name: path.basename(filePath), dataUri: `data:${mime};base64,${bytes.toString('base64')}` };
});

ipcMain.handle(
  'omd:saveLabelSession',
  async (_event, session: StudioLabelSession): Promise<string | null> => {
    const save = await dialog.showSaveDialog({
      title: 'Save label session',
      defaultPath: 'labels.omdsession.json',
      filters: [{ name: 'OMD label session', extensions: ['json'] }],
    });
    if (save.canceled || !save.filePath) return null;
    await writeFile(save.filePath, JSON.stringify(session, null, 2), 'utf8');
    return save.filePath;
  },
);

ipcMain.handle('omd:openLabelSession', async (): Promise<StudioLabelSession | null> => {
  const pick = await dialog.showOpenDialog({
    title: 'Open label session',
    properties: ['openFile'],
    filters: [{ name: 'OMD label session', extensions: ['json'] }],
  });
  if (pick.canceled || pick.filePaths.length === 0) return null;
  const raw = await readFile(pick.filePaths[0]!, 'utf8');
  const parsed = JSON.parse(raw) as StudioLabelSession;
  if (parsed.version !== 1 || !Array.isArray(parsed.packages)) {
    throw new Error('That file is not a label session.');
  }
  return {
    version: 1,
    templateId: typeof parsed.templateId === 'string' ? parsed.templateId : 'mini-cd-jewel',
    fit: parsed.fit ?? 'fill',
    packages: parsed.packages.map((p) => ({ source: p.source, copies: Math.max(1, Math.floor(p.copies ?? 1)) })),
    customImages: Array.isArray(parsed.customImages)
      ? parsed.customImages.map((c) => ({
          name: c.name,
          dataUri: c.dataUri,
          copies: Math.max(1, Math.floor(c.copies ?? 1)),
        }))
      : [],
  };
});

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
    const size = result.pages[0]?.page ?? { widthIn: 8.5, heightIn: 11 };
    const pdf = await sheetsToPdf(
      result.pages.map((page) => page.svg),
      { widthIn: size.widthIn, heightIn: size.heightIn },
    );
    if (!pdf) return null;
    const save = await dialog.showSaveDialog({
      title: 'Save label sheet',
      defaultPath: 'omd-labels.pdf',
      filters: [{ name: 'PDF document', extensions: ['pdf'] }],
    });
    if (save.canceled || !save.filePath) return null;
    await writeFile(save.filePath, pdf);
    return save.filePath;
  },
);

ipcMain.handle(
  'omd:printLabelSheet',
  async (_event, request: StudioLabelSheetRequest): Promise<boolean> => {
    const result = await buildPackagesLabelSheet(labelOptions(request));
    const size = result.pages[0]?.page ?? { widthIn: 8.5, heightIn: 11 };
    return printSheets(
      result.pages.map((page) => page.svg),
      { widthIn: size.widthIn, heightIn: size.heightIn },
    );
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
  return detectOmdDisc();
});

ipcMain.handle('omd:openPackageFolder', async (): Promise<StudioDiscInfo | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Open an OMD package or disc',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const chosen = result.filePaths[0]!;
  const info = await buildDiscInfo(chosen);
  if (!info) {
    throw new Error('That folder is not an OMD package (no OMD-MANIFEST.json was found).');
  }
  return info;
});

ipcMain.handle('omd:verifyDisc', async (_event, source: string): Promise<StudioVerifyResult> => {
  const validation = await validatePackage(source);
  return { valid: validation.valid, errors: validation.errors.map(toFinding) };
});

ipcMain.handle('omd:chooseRipDestination', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Choose your catalog folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!;
});

ipcMain.handle('omd:rip', async (event, request: StudioRipRequest): Promise<StudioRipResult> => {
  try {
    const { manifest } = await inspectPackage(request.source);
    const outDir = path.join(request.destDir, slugifyForPath(manifest.discId));
    const result = await ripPackage({
      sourceDir: request.source,
      mode: request.mode,
      outDir,
      ...(request.overwrite !== undefined ? { overwrite: request.overwrite } : {}),
      onProgress: (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('omd:rip:progress', progress);
      },
    });
    return {
      ok: true,
      outDir: result.outDir,
      discId: result.manifest.discId,
      mode: result.mode,
      filesMatched: result.filesMatched,
      filesTotal: result.filesTotal,
      verified: result.verified,
    };
  } catch (err) {
    if (err instanceof OutputExistsError) {
      return { ok: false, exists: true, outDir: err.outDir };
    }
    return { ok: false, error: (err as Error).message };
  }
});

ipcMain.handle('omd:openDisc', async (_event, source: string): Promise<StudioDiscInfo | null> => {
  // Quick load (skip the full re-hash) so opening/playing a catalog album is
  // instant; the renderer verifies integrity in the background.
  return buildDiscInfo(source, true);
});

ipcMain.handle('omd:mixtapeSources', async (_event, dir: string): Promise<StudioMixtapeAlbum[]> => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const albums: StudioMixtapeAlbum[] = [];
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
    albums.push({
      source,
      discId: inspection.discId,
      artist: inspection.artist,
      album: inspection.album,
      ...(coverDataUri ? { coverDataUri } : {}),
      tracks: inspection.tracks.map((track) => ({
        path: path.resolve(source, ...track.filename.split('/')),
        number: track.number,
        title: track.title,
        ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
      })),
    });
  }
  albums.sort((a, b) => a.discId.localeCompare(b.discId));
  return albums;
});

ipcMain.handle(
  'omd:createMixtape',
  async (_event, request: StudioMixtapeRequest): Promise<StudioDiscInfo | null> => {
    const outDir = path.join(request.destDir, slugifyForPath(request.discId || request.album));
    await createMixtape({
      tracks: request.tracks,
      discId: request.discId,
      artist: request.artist,
      album: request.album,
      outDir,
      overwrite: true,
      ...(FFMPEG_PATH ? { convert: { ffmpegPath: FFMPEG_PATH } } : {}),
      ...(request.releaseYear !== null ? { releaseYear: request.releaseYear } : {}),
      coverSourcePath: request.coverSourcePath || DEFAULT_MIXTAPE_COVER,
      generator: { name: 'OMD Studio', version: STUDIO_VERSION },
    });
    return buildDiscInfo(outDir);
  },
);

ipcMain.handle('omd:chooseCoverImage', async (_event, defaultDir?: string): Promise<StudioCoverPick | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Choose cover art',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    ...(defaultDir ? { defaultPath: defaultDir } : {}),
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0]!;
  const mime = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const data = await readFile(filePath);
  return { path: filePath, dataUri: `data:${mime};base64,${data.toString('base64')}` };
});

ipcMain.handle(
  'omd:updatePackage',
  async (_event, request: StudioUpdateRequest): Promise<StudioDiscInfo | null> => {
    await updatePackageMetadata({
      packageDir: request.source,
      discId: request.discId,
      artist: request.artist,
      album: request.album,
      releaseYear: request.releaseYear,
      ...(request.trackTitles ? { trackTitles: request.trackTitles } : {}),
      ...(request.coverSourcePath ? { coverSourcePath: request.coverSourcePath } : {}),
      generator: { name: 'OMD Studio', version: STUDIO_VERSION },
    });
    return buildDiscInfo(request.source);
  },
);

/** Whether a directory directly contains at least one supported audio file. */
async function hasAudioFiles(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some(
      (e) => e.isFile() && (ALL_AUDIO_EXTENSIONS as readonly string[]).includes(path.extname(e.name).toLowerCase()),
    );
  } catch {
    return false;
  }
}

/**
 * Find importable album folders under a chosen root: the root itself when it
 * holds audio files, otherwise each immediate subfolder that does.
 */
async function findAlbumFolders(root: string): Promise<string[]> {
  if (await hasAudioFiles(root)) return [root];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const albums: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sub = path.join(root, entry.name);
    if (await hasAudioFiles(sub)) albums.push(sub);
  }
  return albums.sort((a, b) => a.localeCompare(b));
}

ipcMain.handle('omd:scanImportFolder', async (): Promise<StudioImportScan> => {
  const pick = await dialog.showOpenDialog({
    title: 'Choose a music folder to import',
    properties: ['openDirectory'],
  });
  if (pick.canceled || pick.filePaths.length === 0) {
    return { canceled: true, albums: [] };
  }
  const sourceDir = pick.filePaths[0]!;
  const albums = await findAlbumFolders(sourceDir);
  return { canceled: false, sourceDir, albums };
});

ipcMain.handle(
  'omd:inspectImportAlbum',
  async (_event, sourceDir: string): Promise<StudioSourceDraft> => {
    const draft = await inspectSourceAlbum(sourceDir);
    const coverPreview = draft.coverSourcePath
      ? await readCoverDataUri(path.dirname(draft.coverSourcePath), path.basename(draft.coverSourcePath))
      : undefined;
    return {
      sourceDir: draft.sourceDir,
      detectedCodec: draft.detectedCodec,
      codecsPresent: draft.codecsPresent,
      artist: draft.artist,
      album: draft.album,
      suggestedDiscId: draft.suggestedDiscId,
      multipleArtists: draft.multipleArtists,
      ...(draft.releaseYear !== undefined ? { releaseYear: draft.releaseYear } : {}),
      ...(draft.coverSourcePath ? { coverSourcePath: draft.coverSourcePath } : {}),
      ...(coverPreview ? { coverPreview } : {}),
      tracks: draft.tracks,
    };
  },
);

ipcMain.handle(
  'omd:importAlbum',
  async (event, request: StudioImportRequest): Promise<StudioDiscInfo | null> => {
    const outDir = path.join(request.destDir, slugifyForPath(request.discId || request.album));
    await createPackage({
      sourceDir: request.sourceDir,
      outDir,
      discId: request.discId,
      artist: request.artist,
      album: request.album,
      audioCodec: request.audioCodec,
      trackMeta: request.trackMeta,
      ...(request.releaseYear !== null ? { releaseYear: request.releaseYear } : {}),
      ...(request.coverSourcePath ? { coverSourcePath: request.coverSourcePath } : {}),
      ...(request.overwrite ? { overwrite: true } : {}),
      ...(FFMPEG_PATH ? { convert: { ffmpegPath: FFMPEG_PATH } } : {}),
      generator: { name: 'OMD Studio', version: STUDIO_VERSION },
      onProgress: (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('omd:import:progress', progress);
      },
    });
    return buildDiscInfo(outDir);
  },
);

let libraryWatcher: ReturnType<typeof watch> | undefined;
let libraryWatchTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Watch the current library folder and notify the renderer (debounced) when its
 * contents change, so the Catalog reflects packages added or deleted on disk
 * without a manual refresh. Only one folder is watched at a time.
 */
function watchLibrary(dir: string, sender: Electron.WebContents): void {
  libraryWatcher?.close();
  try {
    libraryWatcher = watch(dir, () => {
      clearTimeout(libraryWatchTimer);
      libraryWatchTimer = setTimeout(() => {
        if (!sender.isDestroyed()) sender.send('omd:libraryChanged');
      }, 300);
    });
  } catch {
    libraryWatcher = undefined;
  }
}

ipcMain.handle('omd:chooseLibraryFolder', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Choose a library folder',
    properties: ['openDirectory'],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!;
});

ipcMain.handle('omd:scanLibrary', async (_event, dir: string): Promise<CatalogEntry[]> => {
  watchLibrary(dir, _event.sender);
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

ipcMain.handle('omd:deletePackage', async (_event, source: string): Promise<void> => {
  // Safety: only remove a folder that actually looks like an OMD package.
  try {
    await access(path.join(source, 'OMD-MANIFEST.json'));
  } catch {
    throw new Error('That folder is not an OMD package.');
  }
  await rm(source, { recursive: true, force: true });
});

void app.whenReady().then(async () => {
  protocol.handle('omd-audio', async (request) => {
    const requested = new URL(request.url).searchParams.get('p');
    if (!requested || !isAllowedMediaPath(requested)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const data = await readFile(requested);
      const ext = path.extname(requested).toLowerCase();
      const codec = codecForExtension(ext);
      const type = codec
        ? AUDIO_CODEC_MIME[codec]
        : ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
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

  // Build the renderer boot config; fixtures mode seeds the library folder.
  const boot: StudioBootConfig = {
    dataMode: runtimeConfig.dataMode,
    headless: runtimeConfig.headless,
    // The harness surface is only needed when we drive the app headlessly.
    harness: runtimeConfig.headless,
    ...(runtimeConfig.initialView ? { initialView: runtimeConfig.initialView } : {}),
    ...(runtimeConfig.themeId ? { themeId: runtimeConfig.themeId } : {}),
  };

  if (runtimeConfig.dataMode === 'fixtures') {
    const root = path.join(app.getPath('userData'), 'fixtures');
    const library = await ensureFixtureLibrary(root, runtimeConfig.resetFixtures);
    installFixtures(library, { buildDiscInfo });
    boot.libraryDir = library.libraryDir;
  }

  const window = createWindow(boot, runtimeConfig.headless, runtimeConfig.windowSize, runtimeConfig.kiosk);

  // In screenshot mode, drive the app through each view, capture, then quit.
  if (runtimeConfig.screenshotViews.length > 0) {
    const outDir = path.resolve(runtimeConfig.outDir);
    try {
      await runScreenshotHarness(window, {
        views: runtimeConfig.screenshotViews,
        outDir,
        dataMode: runtimeConfig.dataMode,
      });
      console.log(`[omd-studio] screenshots written to ${outDir}`);
    } catch (err) {
      console.error('[omd-studio] screenshot harness failed:', err);
    } finally {
      app.quit();
    }
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(boot, runtimeConfig.headless, runtimeConfig.windowSize, runtimeConfig.kiosk);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
