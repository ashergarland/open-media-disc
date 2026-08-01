import { stat } from 'node:fs/promises';
import { inspectPackage, validatePackage } from './package.js';
import { deriveVolumeLabel } from './discTitle.js';
import { WindowsImapiImageBackend } from './discImageWindows.js';

/** Request passed to a {@link DiscImageBackend} to build a UDF image file. */
export interface DiscImageBuildRequest {
  /** Path to the OMD package directory whose contents become the disc root. */
  packageDir: string;
  /** Destination path for the image file. */
  outPath: string;
  /** UDF volume label to stamp on the image (best-effort from the disc title). */
  volumeLabel: string;
}

/**
 * A platform-specific engine that turns a package folder into a burn-ready UDF
 * disc image. Backends are injectable so the orchestration in
 * {@link buildDiscImage} can be tested without optical tooling.
 */
export interface DiscImageBackend {
  /** Human-readable backend name, for example `Windows IMAPI2`. */
  readonly name: string;
  /** Whether this backend can run in the current environment. */
  isAvailable(): Promise<boolean>;
  /** Build a UDF image file from the package directory. */
  build(request: DiscImageBuildRequest): Promise<void>;
}

/** Options for {@link buildDiscImage}. */
export interface BuildDiscImageOptions {
  /** OMD package directory to image. */
  packageDir: string;
  /** Destination image file path. */
  outPath: string;
  /** Override the UDF volume label. Defaults to a label derived from the disc title. */
  volumeLabel?: string;
  /** Validate the package before imaging. Defaults to `true`. */
  validate?: boolean;
  /** Inject a backend (mainly for tests). Defaults to the platform backend. */
  backend?: DiscImageBackend;
}

/** Result of {@link buildDiscImage}. */
export interface BuildDiscImageResult {
  /** Path to the written image file. */
  outPath: string;
  /** UDF volume label stamped on the image. */
  volumeLabel: string;
  /** Size of the written image file, in bytes. */
  sizeBytes: number;
  /** Name of the backend that produced the image. */
  backend: string;
}

/** Optional process-wide backend override (used by tests and Studio fixtures). */
let discImageBackendOverride: DiscImageBackend | undefined;

/**
 * Override the disc-image backend returned by {@link resolveDiscImageBackend}
 * process-wide, so the imaging orchestration can run without optical tooling
 * (for example OMD Studio's fixtures/headless mode). Pass `undefined` to restore
 * the platform default.
 */
export function setDiscImageBackendOverride(backend: DiscImageBackend | undefined): void {
  discImageBackendOverride = backend;
}

/**
 * Resolve the disc-image backend for the current platform.
 *
 * v0.2 ships a Windows (IMAPI2) backend only. Linux and macOS backends are
 * planned follow-ups; see the roadmap. On unsupported platforms this returns the
 * Windows backend, whose {@link DiscImageBackend.isAvailable} reports `false` so
 * {@link buildDiscImage} fails with a clear message. A backend installed with
 * {@link setDiscImageBackendOverride} takes precedence when present.
 */
export function resolveDiscImageBackend(): DiscImageBackend {
  return discImageBackendOverride ?? new WindowsImapiImageBackend();
}

/**
 * Build a burn-ready UDF disc image from a validated OMD package.
 *
 * The image content mirrors the package tree exactly and its UDF volume label is
 * a best-effort rendering of the disc title (see `spec/OMD_DISC_LAYOUT.md`).
 * Building an image needs no optical hardware. Writing the image to a disc is a
 * separate step.
 */
export async function buildDiscImage(
  options: BuildDiscImageOptions,
): Promise<BuildDiscImageResult> {
  const { packageDir, outPath } = options;

  // A burn-ready image must come from a valid package.
  if (options.validate !== false) {
    const validation = await validatePackage(packageDir);
    if (!validation.valid) {
      const detail = validation.errors.map((e) => `[${e.code}] ${e.message}`).join('; ');
      throw new Error(`Cannot image an invalid OMD package: ${detail}`);
    }
  }

  // The UDF volume label is derived from the disc title unless the caller
  // overrides it. Identity always comes from the manifest, not this label.
  const { manifest } = await inspectPackage(packageDir);
  const volumeLabel = options.volumeLabel ?? deriveVolumeLabel(manifest);

  const backend = options.backend ?? resolveDiscImageBackend();
  if (!(await backend.isAvailable())) {
    throw new Error(
      `Disc image backend "${backend.name}" is not available in this environment. ` +
        `Building a UDF image currently requires Windows (IMAPI2).`,
    );
  }

  await backend.build({ packageDir, outPath, volumeLabel });

  const sizeBytes = (await stat(outPath)).size;
  return { outPath, volumeLabel, sizeBytes, backend: backend.name };
}
