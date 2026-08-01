import { randomUUID } from 'node:crypto';
import { rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WindowsImapiBurnBackend } from './burnWindows.js';
import { buildDiscImage, type DiscImageBackend } from './discImage.js';
import { validatePackage, type ValidatePackageOptions } from './package.js';
import type { PackageValidationResult } from './validationTypes.js';

/**
 * A writable optical drive, as seen by a {@link BurnBackend}.
 *
 * `mountPath` is the filesystem path where the disc is readable once written
 * (for example a Windows drive root like `E:\`), and is where a burn is verified.
 */
export interface BurnDrive {
  /** Filesystem path where the disc is (or will be) mounted, e.g. `E:\`. */
  mountPath: string;
  /** Backend-specific device identifier, if any. */
  id?: string;
  /** Human-readable description, for example the recorder model. */
  description?: string;
}

/** Request to write a burn-ready image file to a drive. */
export interface BurnImageRequest {
  /** Path to the burn-ready image file to write. */
  imagePath: string;
  /** Target drive. */
  drive: BurnDrive;
}

/** Whether optical media can be erased and rewritten. */
export type DiscMediaKind = 'rewritable' | 'write-once' | 'unknown';

/** The disc currently in a drive, as probed by a {@link BurnBackend}. */
export interface MediaInfo {
  /** Whether the disc can be erased (`rewritable`) or is `write-once`. */
  kind: DiscMediaKind;
  /** Whether the disc currently holds no data. */
  blank: boolean;
  /** Friendly media name, for example `DVD-R`, `DVD-RW`, `BD-RE`. */
  typeName?: string;
  /** Total writable capacity in bytes, when known. */
  capacityBytes?: number;
}

/** A phase of a burn, reported through {@link BurnImageOptions.onProgress}. */
export type BurnPhase =
  | 'building'
  | 'probing'
  | 'blanking'
  | 'writing'
  | 'remounting'
  | 'verifying'
  | 'ejecting';

/** A progress update emitted during a burn. */
export interface BurnProgress {
  /** The phase that is now starting. */
  phase: BurnPhase;
  /** Total bytes for the phase, when known (for example the image size while writing). */
  totalBytes?: number;
}

/**
 * A platform-specific engine that writes an image to physical optical media.
 * Backends are injectable so the {@link burnImage} orchestration can be tested
 * without a real drive. The Windows (IMAPI2) backend arrives in a later step.
 */
export interface BurnBackend {
  /** Human-readable backend name, for example `Windows IMAPI2`. */
  readonly name: string;
  /** Whether this backend can run in the current environment. */
  isAvailable(): Promise<boolean>;
  /** List writable optical drives available to this backend. */
  listDrives(): Promise<BurnDrive[]>;
  /** Whether the drive currently holds no data (nothing to blank). */
  isBlank(drive: BurnDrive): Promise<boolean>;
  /** Erase a rewritable disc so it will contain only the next write. */
  blank(drive: BurnDrive): Promise<void>;
  /** Write an image file to the drive. */
  writeImage(request: BurnImageRequest): Promise<void>;
  /**
   * Probe the disc in the drive: rewritable vs write-once, blank or not, media
   * name, and capacity. Optional; when absent the orchestration falls back to
   * {@link isBlank}.
   */
  probeMedia?(drive: BurnDrive): Promise<MediaInfo>;
  /**
   * Force the operating system to re-read the freshly burned disc in place so it
   * can be read back and verified without a physical reinsert. Optional; a
   * backend that does not need it may omit it.
   */
  remount?(drive: BurnDrive): Promise<void>;
  /** Eject the disc. Used as the completion signal after a successful burn. Optional. */
  eject?(drive: BurnDrive): Promise<void>;
}

/**
 * Verify a mounted disc by validating it as an OMD package: every file is
 * re-checked against `CHECKSUMS.sha256` and the per-track `sha256` in the
 * manifest. See `spec/OMD_VALIDATION_RULES.md` section 7. A disc passes when the
 * result is `valid` (zero errors).
 */
export async function verifyDisc(
  mountPath: string,
  options?: ValidatePackageOptions,
): Promise<PackageValidationResult> {
  return validatePackage(mountPath, options);
}

/** Options for {@link burnImage}. */
export interface BurnImageOptions {
  /** Path to the burn-ready image file. */
  imagePath: string;
  /** Target drive. */
  drive: BurnDrive;
  /** Backend that performs the write. Defaults to the platform backend. */
  backend?: BurnBackend;
  /** Blank a non-blank rewritable disc before writing. Defaults to `true`. */
  blank?: boolean;
  /** Verify the burned disc afterward. Defaults to `true`. */
  verify?: boolean;
  /** Eject the disc after a successful burn. Defaults to `true`. */
  eject?: boolean;
  /** Pre-probed media info, to avoid a second probe. Optional. */
  media?: MediaInfo;
  /** Called before each phase of the burn, for progress reporting. Optional. */
  onProgress?: (progress: BurnProgress) => void;
}

/** Result of {@link burnImage}. */
export interface BurnImageResult {
  /** The image that was written. */
  imagePath: string;
  /** The drive that was written to. */
  drive: BurnDrive;
  /** Whether the disc was blanked before writing. */
  blanked: boolean;
  /** Whether post-burn verification passed. */
  verified: boolean;
  /** Verification detail, when verification ran. */
  verification?: PackageValidationResult;
  /** Whether the disc was ejected at the end (only on success, unless disabled). */
  ejected: boolean;
  /** Detected media info, when the backend could probe it. */
  media?: MediaInfo;
  /** Name of the backend that performed the write. */
  backend: string;
}

/**
 * Write a burn-ready image to a disc and verify the result.
 *
 * Blanks a non-blank rewritable disc first (unless disabled), writes the image
 * through the backend, remounts the freshly burned disc in place, then reads it
 * back and verifies it against `CHECKSUMS.sha256`. A failed verification is
 * reported in the result (`verified: false`) rather than thrown, so callers can
 * surface it. On a successful burn the disc is ejected as a completion signal
 * (unless `eject` is `false`); a failed burn is left in the drive for inspection.
 */
export async function burnImage(options: BurnImageOptions): Promise<BurnImageResult> {
  const { imagePath, drive } = options;
  const backend = options.backend ?? resolveBurnBackend();

  if (!(await backend.isAvailable())) {
    throw new Error(
      `Burn backend "${backend.name}" is not available in this environment. ` +
        `Burning currently requires Windows (IMAPI2) with a writer attached.`,
    );
  }

  const emit = (phase: BurnPhase, totalBytes?: number): void =>
    options.onProgress?.({ phase, ...(totalBytes !== undefined ? { totalBytes } : {}) });

  // Probe the disc so we handle rewritable vs write-once media correctly and can
  // check capacity before doing anything destructive.
  emit('probing');
  const media =
    options.media ?? (backend.probeMedia ? await backend.probeMedia(drive) : undefined);

  // Determine the image size for the capacity check and progress reporting.
  let imageSize: number | undefined;
  if (media?.capacityBytes !== undefined || options.onProgress) {
    try {
      imageSize = (await stat(imagePath)).size;
    } catch {
      imageSize = undefined;
    }
  }

  // Capacity guard: never blank or write a disc the image will not fit on.
  if (media?.capacityBytes !== undefined && imageSize !== undefined && imageSize > media.capacityBytes) {
    throw new Error(
      `Image is ${imageSize} bytes but the disc holds ${media.capacityBytes} bytes` +
        `${media.typeName ? ` (${media.typeName})` : ''}. It will not fit.`,
    );
  }

  let blanked = false;
  if (options.blank !== false) {
    if (media) {
      if (media.kind === 'write-once') {
        // Write-once media cannot be erased. A blank disc is fine to write; a
        // used one cannot be reused.
        if (!media.blank) {
          throw new Error(
            `This ${media.typeName ?? 'write-once'} disc already contains data and ` +
              `cannot be erased. Insert a blank disc.`,
          );
        }
      } else if (!media.blank) {
        // Rewritable and not blank: erase it first.
        emit('blanking');
        await backend.blank(drive);
        blanked = true;
      }
    } else if (!(await backend.isBlank(drive))) {
      // Unknown media: fall back to the blank heuristic.
      emit('blanking');
      await backend.blank(drive);
      blanked = true;
    }
  }

  emit('writing', imageSize);
  await backend.writeImage({ imagePath, drive });

  const doVerify = options.verify !== false;
  const doEject = options.eject !== false;

  // Remount the freshly burned disc in place so the OS re-reads the new
  // filesystem. Needed to verify, and to leave a readable disc when not ejecting.
  if ((doVerify || !doEject) && backend.remount) {
    emit('remounting');
    await backend.remount(drive);
  }

  let verified = false;
  let verification: PackageValidationResult | undefined;
  if (doVerify) {
    emit('verifying');
    verification = await verifyDisc(drive.mountPath);
    verified = verification.valid;
  }

  // Eject only on success; a failed burn stays in the drive for inspection.
  const success = doVerify ? verified : true;
  let ejected = false;
  if (doEject && success && backend.eject) {
    emit('ejecting');
    await backend.eject(drive);
    ejected = true;
  }

  return { imagePath, drive, blanked, verified, verification, ejected, media, backend: backend.name };
}

/** Optional process-wide backend override (used by tests and Studio fixtures). */
let burnBackendOverride: BurnBackend | undefined;

/**
 * Override the burn backend returned by {@link resolveBurnBackend} process-wide.
 *
 * This lets tooling run the real burn orchestration against a fake drive with no
 * optical hardware (for example OMD Studio's fixtures/headless mode). Pass
 * `undefined` to restore the platform default.
 */
export function setBurnBackendOverride(backend: BurnBackend | undefined): void {
  burnBackendOverride = backend;
}

/**
 * Resolve the burn backend for the current platform.
 *
 * v0.2 ships a Windows (IMAPI2) backend only. Linux and macOS backends are
 * planned follow-ups; see the roadmap. On unsupported platforms the returned
 * backend's {@link BurnBackend.isAvailable} reports `false`. A backend installed
 * with {@link setBurnBackendOverride} takes precedence when present.
 */
export function resolveBurnBackend(): BurnBackend {
  return burnBackendOverride ?? new WindowsImapiBurnBackend();
}

/** Options for {@link burnPackage}. */
export interface BurnPackageOptions {
  /** A package directory or a prebuilt image file. */
  source: string;
  /** Target drive. */
  drive: BurnDrive;
  /** Burn backend. Defaults to the platform backend. */
  backend?: BurnBackend;
  /** Image backend used when building from a package directory. Defaults to the platform backend. */
  imageBackend?: DiscImageBackend;
  /** UDF volume label override when building an image from a package. */
  volumeLabel?: string;
  /** Blank a non-blank rewritable disc before writing. Defaults to `true`. */
  blank?: boolean;
  /** Verify the burned disc afterward. Defaults to `true`. */
  verify?: boolean;
  /** Eject the disc after a successful burn. Defaults to `true`. */
  eject?: boolean;
  /** Pre-probed media info, to avoid a second probe. Optional. */
  media?: MediaInfo;
  /** Called before each phase of the burn, for progress reporting. Optional. */
  onProgress?: (progress: BurnProgress) => void;
}

/**
 * Burn a package or a prebuilt image to a disc.
 *
 * When `source` is a directory it is treated as an OMD package: a temporary
 * burn-ready image is built (and removed afterward), then written. When `source`
 * is a file it is written directly. The write is then verified.
 */
export async function burnPackage(options: BurnPackageOptions): Promise<BurnImageResult> {
  const info = await stat(options.source);

  let imagePath = options.source;
  let tempImage: string | undefined;
  if (info.isDirectory()) {
    options.onProgress?.({ phase: 'building' });
    tempImage = path.join(tmpdir(), `omd-burn-${randomUUID()}.img`);
    await buildDiscImage({
      packageDir: options.source,
      outPath: tempImage,
      ...(options.volumeLabel ? { volumeLabel: options.volumeLabel } : {}),
      ...(options.imageBackend ? { backend: options.imageBackend } : {}),
    });
    imagePath = tempImage;
  }

  try {
    return await burnImage({
      imagePath,
      drive: options.drive,
      ...(options.backend ? { backend: options.backend } : {}),
      ...(options.blank !== undefined ? { blank: options.blank } : {}),
      ...(options.verify !== undefined ? { verify: options.verify } : {}),
      ...(options.eject !== undefined ? { eject: options.eject } : {}),
      ...(options.media ? { media: options.media } : {}),
      ...(options.onProgress ? { onProgress: options.onProgress } : {}),
    });
  } finally {
    if (tempImage) {
      await rm(tempImage, { force: true });
    }
  }
}
