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

/** A validation finding surfaced to the renderer. */
export interface StudioValidationFinding {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
}

/** A packaged track summary. */
export interface StudioTrack {
  number: number;
  title: string;
  durationSeconds?: number;
}

/** A successful package result. */
export interface StudioPackageSummary {
  kind: 'ok';
  outDir: string;
  discId: string;
  artist: string;
  album: string;
  trackCount: number;
  totalSizeBytes: number;
  valid: boolean;
  errors: StudioValidationFinding[];
  warnings: StudioValidationFinding[];
  tracks: StudioTrack[];
  coverDataUri?: string;
}

/** Returned when the output folder already exists and overwrite was not set. */
export interface StudioPackageExists {
  kind: 'exists';
  outDir: string;
}

export type StudioPackageResponse = StudioPackageSummary | StudioPackageExists;

/** A rendered label sheet. */
export interface StudioLabel {
  svg: string;
  discId: string;
  artist: string;
  album: string;
}

/** A phase of a burn, mirrored from the core burn backend. */
export type StudioBurnPhase =
  | 'building'
  | 'probing'
  | 'blanking'
  | 'writing'
  | 'remounting'
  | 'verifying'
  | 'ejecting';

/** A burn progress update. */
export interface StudioBurnProgress {
  phase: StudioBurnPhase;
}

/** A burn request from the renderer. */
export interface StudioBurnRequest {
  packageDir: string;
  driveMountPath: string;
  blank?: boolean;
  verify?: boolean;
  eject?: boolean;
}

/** The outcome of a burn. */
export interface StudioBurnResult {
  ok: boolean;
  verified: boolean;
  blanked: boolean;
  ejected: boolean;
  backend: string;
  drive: string;
  error?: string;
}

/** The API exposed to the renderer on `window.omd` via the preload bridge. */
export interface OmdStudioApi {
  getInfo(): Promise<StudioInfo>;
  listDrives(): Promise<StudioDrive[]>;
  selectAlbumFolder(): Promise<string | null>;
  createPackage(sourceDir: string, overwrite?: boolean): Promise<StudioPackageResponse>;
  buildLabel(packageDir: string): Promise<StudioLabel>;
  saveLabel(packageDir: string): Promise<string | null>;
  burn(
    request: StudioBurnRequest,
    onProgress: (progress: StudioBurnProgress) => void,
  ): Promise<StudioBurnResult>;
}
