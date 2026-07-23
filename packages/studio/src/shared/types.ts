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

/** A rendered label sheet. */
/** One package chosen for a batch label sheet, with how many copies to place. */
export interface StudioLabelSelection {
  source: string;
  copies: number;
}

/** A request to build a batch label sheet from one or more packages. */
export interface StudioLabelSheetRequest {
  packages: StudioLabelSelection[];
  /** The label template to render with (see {@link StudioLabelTemplate}). */
  templateId?: string;
  fit?: 'fill' | 'fit' | 'stretch';
  /** Custom images added to the sheet, as data URIs, with a copy count each. */
  customImages?: { imageHref: string; copies: number }[];
}

/** A custom image the user added to a label sheet (kept as a self-contained data URI). */
export interface StudioLabelImage {
  name: string;
  dataUri: string;
}

/** A saved Labels work session: selections and settings to reopen later. */
export interface StudioLabelSession {
  version: 1;
  templateId: string;
  fit: 'fill' | 'fit' | 'stretch';
  packages: StudioLabelSelection[];
  customImages: { name: string; dataUri: string; copies: number }[];
}

/** A label template offered in the Labels view (a page + label-stock preset). */
export interface StudioLabelTemplate {
  id: string;
  name: string;
  shape: 'rect' | 'disc';
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
  /** Whether the codec is lossless (FLAC, WAV). */
  audioLossless?: boolean;
  /** Bits per sample, e.g. 16 or 24. */
  audioBitDepth?: number;
  /** Sample rate in Hz, e.g. 44100. */
  audioSampleRate?: number;
  /** Average bitrate in bits per second (lossy codecs). */
  audioBitrate?: number;
  /** Release year from the manifest. */
  releaseYear?: number;
  /** Physical disc format when read from a drive, e.g. "8cm mini DVD-RW". */
  discFormat?: string;
  /** Probed media type name, e.g. "DVD-RW", "DVD-R", "BD-RE". */
  discMediaType?: string;
  /** Whether the physical media is rewritable (RW/RE) rather than write-once (R). */
  discRewritable?: boolean;
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

/** A request to edit an existing catalog package's album metadata. */
export interface StudioUpdateRequest {
  /** The package folder to edit. */
  source: string;
  discId: string;
  artist: string;
  album: string;
  /** Release year, or null to clear it. */
  releaseYear: number | null;
  /** Track title overrides, matched by track number. */
  trackTitles?: { number: number; title: string }[];
  /** Absolute path to a replacement cover image (jpg/png). */
  coverSourcePath?: string;
}

/** A chosen cover image, with a data URI for immediate preview. */
export interface StudioCoverPick {
  path: string;
  dataUri: string;
}

/** A source track available to add to a mixtape (one catalog album's track). */
export interface StudioMixtapeSourceTrack {
  /** Absolute path to the FLAC file. */
  path: string;
  number: number;
  title: string;
  durationSeconds?: number;
}

/** A catalog album exposed as a source of tracks for the mixtape builder. */
export interface StudioMixtapeAlbum {
  source: string;
  discId: string;
  artist: string;
  album: string;
  coverDataUri?: string;
  tracks: StudioMixtapeSourceTrack[];
}

/** A request to compile a mixtape package into the catalog. */
export interface StudioMixtapeRequest {
  /** The library folder the mixtape package is written into. */
  destDir: string;
  discId: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  coverSourcePath?: string;
  /** Selected tracks in play order. */
  tracks: { sourcePath: string; title?: string }[];
}

/** The audio codecs a package can use (one per package). */
export const STUDIO_AUDIO_CODECS = ['FLAC', 'MP3', 'AAC', 'Vorbis', 'Opus', 'WAV'] as const;
export type StudioAudioCodec = (typeof STUDIO_AUDIO_CODECS)[number];

/** A request to import one audio album folder into the catalog, with edits. */
export interface StudioImportRequest {
  /** The library folder the new package is written into. */
  destDir: string;
  /** The album source folder to import. */
  sourceDir: string;
  /** Target audio codec; source files in other codecs are transcoded to it. */
  audioCodec: StudioAudioCodec;
  /** Disc title. */
  discId: string;
  /** Album artist. */
  artist: string;
  /** Album title. */
  album: string;
  /** Release year, or null to omit. */
  releaseYear: number | null;
  /** Per-track metadata edits by resulting (1..N) track number. */
  trackMeta: {
    number: number;
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
  }[];
  /** Replacement cover image path (else the detected cover is used). */
  coverSourcePath?: string;
  /** Overwrite an existing package with the same slug. */
  overwrite?: boolean;
}

/** Result of choosing a folder to import: the album folders found within. */
export interface StudioImportScan {
  /** True when the user cancelled the folder picker. */
  canceled?: boolean;
  /** The chosen source folder. */
  sourceDir?: string;
  /** Absolute paths of the importable album folders found. */
  albums: string[];
}

/** A preview of the metadata an import would infer from a source album folder. */
export interface StudioSourceDraft {
  sourceDir: string;
  /** The most common codec present, suggested as the default target. */
  detectedCodec: StudioAudioCodec;
  /** The distinct codecs present in the folder. */
  codecsPresent: StudioAudioCodec[];
  artist: string;
  album: string;
  /** A suggested disc title ("Artist - Album"). */
  suggestedDiscId: string;
  releaseYear?: number;
  /** True when the source tracks carry more than one distinct artist. */
  multipleArtists: boolean;
  /** Absolute path to the detected cover image, if any. */
  coverSourcePath?: string;
  /** A data URI preview of the detected cover, if any. */
  coverPreview?: string;
  tracks: {
    number: number;
    title: string;
    artist?: string;
    album?: string;
    year?: number;
    sourceCodec: StudioAudioCodec;
    durationSeconds?: number;
  }[];
}

/** Progress while importing music into the catalog. */
export interface StudioImportProgress {
  index: number;
  total: number;
  album: string;
}

/** The outcome of importing one album folder. */
export interface StudioImportItem {
  album: string;
  ok: boolean;
  outDir?: string;
  skipped?: boolean;
  error?: string;
}

/** The overall outcome of an import. */
export interface StudioImportResult {
  /** True when the user cancelled the source-folder picker. */
  canceled?: boolean;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  items: StudioImportItem[];
}

/** The API exposed to the renderer on `window.omd` via the preload bridge. */
export interface OmdStudioApi {
  getInfo(): Promise<StudioInfo>;
  listDrives(): Promise<StudioDrive[]>;
  labelTemplates(): Promise<StudioLabelTemplate[]>;
  buildLabelSheet(request: StudioLabelSheetRequest): Promise<StudioLabelSheetResult>;
  saveLabelSheet(request: StudioLabelSheetRequest): Promise<string | null>;
  printLabelSheet(request: StudioLabelSheetRequest): Promise<boolean>;
  pickLabelImage(): Promise<StudioLabelImage | null>;
  saveLabelSession(session: StudioLabelSession): Promise<string | null>;
  openLabelSession(): Promise<StudioLabelSession | null>;
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
  /** Choose a replacement cover image; returns its path and a preview data URI. */
  chooseCoverImage(defaultDir?: string): Promise<StudioCoverPick | null>;
  /** Edit a catalog package's album metadata (and optionally cover); returns the refreshed info. */
  updatePackage(request: StudioUpdateRequest): Promise<StudioDiscInfo | null>;
  rip(request: StudioRipRequest): Promise<StudioRipResult>;
  chooseRipDestination(): Promise<string | null>;
  /** Pick a source folder and list the importable album folders within. */
  scanImportFolder(): Promise<StudioImportScan>;
  /** Inspect one album folder and return the metadata an import would infer. */
  inspectImportAlbum(sourceDir: string): Promise<StudioSourceDraft>;
  /** Import one album folder (with edited metadata + codec) into the catalog. */
  importAlbum(request: StudioImportRequest): Promise<StudioDiscInfo | null>;
  /** List catalog albums with their tracks (absolute FLAC paths) for the mixtape builder. */
  mixtapeSources(dir: string): Promise<StudioMixtapeAlbum[]>;
  /** Compile a mixtape package into the catalog; returns the new package info. */
  createMixtape(request: StudioMixtapeRequest): Promise<StudioDiscInfo | null>;
  chooseLibraryFolder(): Promise<string | null>;
  scanLibrary(dir: string): Promise<CatalogEntry[]>;
  /**
   * Subscribe to changes in the watched library folder (packages added or
   * removed on disk). Returns an unsubscribe function.
   */
  onLibraryChanged(handler: () => void): () => void;
  revealInFolder(target: string): Promise<void>;
  /** Permanently delete an OMD package folder from disk. */
  deletePackage(source: string): Promise<void>;
  importThemeFile(): Promise<string | null>;
}
