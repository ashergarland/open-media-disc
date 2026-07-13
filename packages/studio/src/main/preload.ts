import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { OmdStudioApi, StudioBurnProgress } from '../shared/types';

/**
 * The preload bridge. It exposes a small, explicit API on `window.omd` so the
 * renderer never touches Node or Electron directly (contextIsolation stays on).
 */
const api: OmdStudioApi = {
  getInfo: () => ipcRenderer.invoke('omd:info'),
  listDrives: () => ipcRenderer.invoke('omd:listDrives'),
  selectAlbumFolder: () => ipcRenderer.invoke('omd:selectAlbumFolder'),
  createPackage: (sourceDir, overwrite) =>
    ipcRenderer.invoke('omd:createPackage', sourceDir, overwrite),
  buildLabel: (packageDir) => ipcRenderer.invoke('omd:buildLabel', packageDir),
  saveLabel: (packageDir) => ipcRenderer.invoke('omd:saveLabel', packageDir),
  burn: (request, onProgress) => {
    const listener = (_event: IpcRendererEvent, progress: StudioBurnProgress): void =>
      onProgress(progress);
    ipcRenderer.on('omd:burn:progress', listener);
    return ipcRenderer
      .invoke('omd:burn', request)
      .finally(() => ipcRenderer.removeListener('omd:burn:progress', listener));
  },
};

contextBridge.exposeInMainWorld('omd', api);
