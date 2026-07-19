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
/** One package chosen for a batch label sheet, with how many copies to place. */
export interface StudioLabelSelection {
  source: string;
  copies: number;
}

/** A request to build a batch label sheet from one or more packages. */
export interface StudioLabelSheetRequest {
  packages: StudioLabelSelection[];
  widthIn?: number;
  heightIn?: number;
  fit?: 'fill' | 'fit' | 'stretch';
}

/** A rendered batch label sheet: one SVG string per printable page. */
export interface StudioLabelSheetResult {
  pages: string[];
  packageCount: number;
  labelCount: number;
  /** Sources skipped because they had no usable cover art. */
  skipped: string[];
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

/** A track on a mounted disc or opened package, ready to play. */
export interface StudioDiscTrack {
  number: number;
  title: string;
  durationSeconds?: number;
  /** An `omd-audio://` URL the renderer can feed to an `<audio>` element. */
  src: string;
}

/** A mounted OMD disc (or opened package) for the player. */
export interface StudioDiscInfo {
  source: string;
  discId: string;
  artist: string;
  album: string;
  trackCount: number;
  totalDurationSeconds: number;
  totalSizeBytes: number;
  valid: boolean;
  /** Audio codec, e.g. "FLAC". */
  audioCodec: string;
  /** Bits per sample, e.g. 16 or 24. */
  audioBitDepth?: number;
  /** Sample rate in Hz, e.g. 44100. */
  audioSampleRate?: number;
  /** Release year from the manifest. */
  releaseYear?: number;
  /** Physical disc format when read from a drive, e.g. "8cm mini DVD-RW". */
  discFormat?: string;
  /** Physical disc capacity in bytes, when read from a drive. */
  discCapacityBytes?: number;
  coverDataUri?: string;
  tracks: StudioDiscTrack[];
}

/** The result of re-verifying a disc. */
export interface StudioVerifyResult {
  valid: boolean;
  errors: StudioValidationFinding[];
}

/** A request to rip a mounted OMD disc (or package folder) back to disk. */
export interface StudioRipRequest {
  /** The mounted disc's mount path, or a package folder on disk. */
  source: string;
  /** Parent folder the ripped copy is written into (as `<destDir>/<disc slug>`). */
  destDir: string;
  /** `package` = re-burnable clone; `album` = friendly FLAC listening folder. */
  mode: 'package' | 'album';
  /** Overwrite the output folder if it already exists. */
  overwrite?: boolean;
}

/** The outcome of a rip. */
export interface StudioRipResult {
  ok: boolean;
  /** True when the output folder already exists and overwrite was not set. */
  exists?: boolean;
  outDir?: string;
  discId?: string;
  mode?: 'package' | 'album';
  filesMatched?: number;
  filesTotal?: number;
  verified?: boolean;
  error?: string;
}

/** A package found while scanning a library folder. */
export interface CatalogEntry {
  source: string;
  discId: string;
  artist: string;
  album: string;
  trackCount: number;
  coverDataUri?: string;
}

/** The API exposed to the renderer on `window.omd` via the preload bridge. */
export interface OmdStudioApi {
  getInfo(): Promise<StudioInfo>;
  listDrives(): Promise<StudioDrive[]>;
  selectAlbumFolder(): Promise<string | null>;
  createPackage(sourceDir: string, overwrite?: boolean): Promise<StudioPackageResponse>;
  buildLabelSheet(request: StudioLabelSheetRequest): Promise<StudioLabelSheetResult>;
  saveLabelSheet(request: StudioLabelSheetRequest): Promise<string | null>;
  printLabelSheet(request: StudioLabelSheetRequest): Promise<boolean>;
  burn(
    request: StudioBurnRequest,
    onProgress: (progress: StudioBurnProgress) => void,
  ): Promise<StudioBurnResult>;
  detectDisc(): Promise<StudioDiscInfo | null>;
  /**
   * Subscribe to live optical-drive changes. The handler fires with the newly
   * detected disc when OMD media is inserted, or `null` when it is ejected.
   * Returns an unsubscribe function.
   */
  onDiscChanged(handler: (disc: StudioDiscInfo | null) => void): () => void;
  openPackageFolder(): Promise<StudioDiscInfo | null>;
  openDisc(source: string): Promise<StudioDiscInfo | null>;
  verifyDisc(source: string): Promise<StudioVerifyResult>;
  rip(request: StudioRipRequest): Promise<StudioRipResult>;
  chooseRipDestination(): Promise<string | null>;
  chooseLibraryFolder(): Promise<string | null>;
  scanLibrary(dir: string): Promise<CatalogEntry[]>;
  revealInFolder(target: string): Promise<void>;
  importThemeFile(): Promise<string | null>;
}
