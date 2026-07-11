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
  /** Backend that performs the write. */
  backend: BurnBackend;
  /** Blank a non-blank rewritable disc before writing. Defaults to `true`. */
  blank?: boolean;
  /** Verify the burned disc afterward. Defaults to `true`. */
  verify?: boolean;
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
  /** Name of the backend that performed the write. */
  backend: string;
}

/**
 * Write a burn-ready image to a disc and verify the result.
 *
 * Blanks a non-blank rewritable disc first (unless disabled), writes the image
 * through the backend, then reads the burned disc back and verifies it against
 * `CHECKSUMS.sha256`. A failed verification is reported in the result
 * (`verified: false`) rather than thrown, so callers can surface it.
 */
export async function burnImage(options: BurnImageOptions): Promise<BurnImageResult> {
  const { imagePath, drive, backend } = options;

  if (!(await backend.isAvailable())) {
    throw new Error(
      `Burn backend "${backend.name}" is not available in this environment. ` +
        `Burning currently requires Windows (IMAPI2) with a writer attached.`,
    );
  }

  let blanked = false;
  if (options.blank !== false && !(await backend.isBlank(drive))) {
    await backend.blank(drive);
    blanked = true;
  }

  await backend.writeImage({ imagePath, drive });

  let verified = false;
  let verification: PackageValidationResult | undefined;
  if (options.verify !== false) {
    verification = await verifyDisc(drive.mountPath);
    verified = verification.valid;
  }

  return { imagePath, drive, blanked, verified, verification, backend: backend.name };
}
