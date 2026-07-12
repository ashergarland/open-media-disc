/**
 * Types shared between the main process, the preload bridge, and the renderer.
 * These describe the `window.omd` API surface the renderer may call.
 */

/** Version and format facts shown in the app. */
export interface StudioInfo {
  studioVersion: string;
  omdFormat: string;
  omdVersion: string;
  electron: string;
  node: string;
}

/** A writable optical drive, mirrored from the core burn backend. */
export interface StudioDrive {
  mountPath: string;
  id?: string;
  description?: string;
}

/** The API exposed to the renderer on `window.omd` via the preload bridge. */
export interface OmdStudioApi {
  getInfo(): Promise<StudioInfo>;
  listDrives(): Promise<StudioDrive[]>;
}
