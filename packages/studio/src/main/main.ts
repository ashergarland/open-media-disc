import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { OMD_FORMAT, OMD_VERSION, resolveBurnBackend } from '@open-album-cartridge/core';
import type { StudioDrive, StudioInfo } from '../shared/types';

/** OMD Studio app version (independent of the disc format version). */
const STUDIO_VERSION = '0.1.0';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1024,
    height: 720,
    backgroundColor: '#14161a',
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
