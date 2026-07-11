/** Severity of a validation result. */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Stable validation codes. See `spec/OMD_VALIDATION_RULES.md`.
 * Other language SDKs should report equivalent codes.
 */
export type ValidationCode =
  // errors
  | 'MISSING_MANIFEST'
  | 'MANIFEST_PARSE_ERROR'
  | 'MANIFEST_SCHEMA_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'MISSING_CHECKSUMS_FILE'
  | 'MISSING_AUDIO_DIR'
  | 'MISSING_TRACK_FILE'
  | 'TRACK_NOT_FLAC'
  | 'DUPLICATE_TRACK_NUMBER'
  | 'TRACK_COUNT_MISMATCH'
  | 'CHECKSUM_MISMATCH'
  | 'CHECKSUM_MISSING_ENTRY'
  // warnings
  | 'MISSING_COVER_ART'
  | 'COVER_ART_NOT_FOUND'
  | 'CAPACITY_WARNING'
  | 'NON_PORTABLE_FILENAME'
  | 'OS_JUNK_FILE'
  | 'UNKNOWN_OMD_VERSION';

/** A single validation finding. */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: ValidationCode;
  message: string;
  /** Optional package-relative path the issue relates to. */
  path?: string;
}

/** Result of {@link validatePackage}. */
export interface PackageValidationResult {
  /** True when there are no `error`-severity issues. */
  valid: boolean;
  issues: ValidationIssue[];
  /** Convenience view: only error-severity issues. */
  errors: ValidationIssue[];
  /** Convenience view: only warning-severity issues. */
  warnings: ValidationIssue[];
}
