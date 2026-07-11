import { DVD_RW_8CM_USABLE_BYTES } from './constants.js';

/** Result of a disc-size estimate against the target media budget. */
export interface DiscSizeEstimate {
  /** Total package size in bytes. */
  totalSizeBytes: number;
  /** Usable capacity budget for the target medium, in bytes. */
  budgetBytes: number;
  /** Bytes remaining (negative when over budget). */
  remainingBytes: number;
  /** Fraction of the budget used (1.0 == full). */
  usedFraction: number;
  /** True when the package exceeds the budget. */
  overBudget: boolean;
}

/**
 * Estimate how a package of `totalSizeBytes` fits the target medium.
 * Defaults to the 8cm DVD-RW usable budget.
 */
export function estimateDiscSize(
  totalSizeBytes: number,
  budgetBytes: number = DVD_RW_8CM_USABLE_BYTES,
): DiscSizeEstimate {
  const remainingBytes = budgetBytes - totalSizeBytes;
  return {
    totalSizeBytes,
    budgetBytes,
    remainingBytes,
    usedFraction: budgetBytes > 0 ? totalSizeBytes / budgetBytes : 0,
    overBudget: totalSizeBytes > budgetBytes,
  };
}

/** Format a byte count as a human-readable string (e.g. "412 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1000;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

/** Format a duration in seconds as `M:SS` or `H:MM:SS`. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
