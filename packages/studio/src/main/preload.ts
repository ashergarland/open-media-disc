import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  OmdStudioApi,
  StudioBurnProgress,
  StudioDiscInfo,
} from '../shared/types';

/**
 * The preload bridge. It exposes a small, explicit API on `window.omd` so the
 * renderer never touches Node or Electron directly (contextIsolation stays on).
 */
const api: OmdStudioApi = {
  getInfo: () => ipcRenderer.invoke('omd:info'),
  listDrives: () => ipcRenderer.invoke('omd:listDrives'),
  labelTemplates: () => ipcRenderer.invoke('omd:labelTemplates'),
  buildLabelSheet: (request) => ipcRenderer.invoke('omd:buildLabelSheet', request),
  saveLabelSheet: (request) => ipcRenderer.invoke('omd:saveLabelSheet', request),
  printLabelSheet: (request) => ipcRenderer.invoke('omd:printLabelSheet', request),
  pickLabelImage: () => ipcRenderer.invoke('omd:pickLabelImage'),
  saveLabelSession: (session) => ipcRenderer.invoke('omd:saveLabelSession', session),
  openLabelSession: () => ipcRenderer.invoke('omd:openLabelSession'),
  burn: (request, onProgress) => {
    const listener = (_event: IpcRendererEvent, progress: StudioBurnProgress): void =>
      onProgress(progress);
    ipcRenderer.on('omd:burn:progress', listener);
    return ipcRenderer
      .invoke('omd:burn', request)
      .finally(() => ipcRenderer.removeListener('omd:burn:progress', listener));
  },
  detectDisc: () => ipcRenderer.invoke('omd:detectDisc'),
  onDiscChanged: (handler) => {
    const listener = (_event: IpcRendererEvent, disc: StudioDiscInfo | null): void => handler(disc);
    ipcRenderer.on('omd:discChanged', listener);
    return () => ipcRenderer.removeListener('omd:discChanged', listener);
  },
  openPackageFolder: () => ipcRenderer.invoke('omd:openPackageFolder'),
  openDisc: (source) => ipcRenderer.invoke('omd:openDisc', source),
  verifyDisc: (source) => ipcRenderer.invoke('omd:verifyDisc', source),
  chooseCoverImage: (defaultDir) => ipcRenderer.invoke('omd:chooseCoverImage', defaultDir),
  updatePackage: (request) => ipcRenderer.invoke('omd:updatePackage', request),
  rip: (request) => ipcRenderer.invoke('omd:rip', request),
  chooseRipDestination: () => ipcRenderer.invoke('omd:chooseRipDestination'),
  scanImportFolder: () => ipcRenderer.invoke('omd:scanImportFolder'),
  inspectImportAlbum: (sourceDir) => ipcRenderer.invoke('omd:inspectImportAlbum', sourceDir),
  importAlbum: (request) => ipcRenderer.invoke('omd:importAlbum', request),
  chooseLibraryFolder: () => ipcRenderer.invoke('omd:chooseLibraryFolder'),
  scanLibrary: (dir) => ipcRenderer.invoke('omd:scanLibrary', dir),
  mixtapeSources: (dir) => ipcRenderer.invoke('omd:mixtapeSources', dir),
  createMixtape: (request) => ipcRenderer.invoke('omd:createMixtape', request),
  onLibraryChanged: (handler) => {
    const listener = (): void => handler();
    ipcRenderer.on('omd:libraryChanged', listener);
    return () => ipcRenderer.removeListener('omd:libraryChanged', listener);
  },
  revealInFolder: (target) => ipcRenderer.invoke('omd:revealInFolder', target),
  deletePackage: (source) => ipcRenderer.invoke('omd:deletePackage', source),
  importThemeFile: () => ipcRenderer.invoke('omd:importThemeFile'),
};

contextBridge.exposeInMainWorld('omd', api);
