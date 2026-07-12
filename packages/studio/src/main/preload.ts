import { contextBridge, ipcRenderer } from 'electron';
import type { OmdStudioApi } from '../shared/types';

/**
 * The preload bridge. It exposes a small, explicit API on `window.omd` so the
 * renderer never touches Node or Electron directly (contextIsolation stays on).
 */
const api: OmdStudioApi = {
  getInfo: () => ipcRenderer.invoke('omd:info'),
  listDrives: () => ipcRenderer.invoke('omd:listDrives'),
};

contextBridge.exposeInMainWorld('omd', api);
