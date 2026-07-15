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
  buildLabelSheet: (request) => ipcRenderer.invoke('omd:buildLabelSheet', request),
  saveLabelSheet: (request) => ipcRenderer.invoke('omd:saveLabelSheet', request),
  printLabelSheet: (request) => ipcRenderer.invoke('omd:printLabelSheet', request),
  burn: (request, onProgress) => {
    const listener = (_event: IpcRendererEvent, progress: StudioBurnProgress): void =>
      onProgress(progress);
    ipcRenderer.on('omd:burn:progress', listener);
    return ipcRenderer
      .invoke('omd:burn', request)
      .finally(() => ipcRenderer.removeListener('omd:burn:progress', listener));
  },
  detectDisc: () => ipcRenderer.invoke('omd:detectDisc'),
  openPackageFolder: () => ipcRenderer.invoke('omd:openPackageFolder'),
  openDisc: (source) => ipcRenderer.invoke('omd:openDisc', source),
  verifyDisc: (source) => ipcRenderer.invoke('omd:verifyDisc', source),
  chooseLibraryFolder: () => ipcRenderer.invoke('omd:chooseLibraryFolder'),
  scanLibrary: (dir) => ipcRenderer.invoke('omd:scanLibrary', dir),
  revealInFolder: (target) => ipcRenderer.invoke('omd:revealInFolder', target),
  importThemeFile: () => ipcRenderer.invoke('omd:importThemeFile'),
};

contextBridge.exposeInMainWorld('omd', api);
