import { describe, expect, it } from 'vitest';
import {
  DVD_RW_8CM_USABLE_BYTES,
  estimateDiscSize,
  formatBytes,
  formatDuration,
} from '../src/index.js';

describe('estimateDiscSize', () => {
  it('reports remaining budget for a small package', () => {
    const est = estimateDiscSize(400_000_000);
    expect(est.overBudget).toBe(false);
    expect(est.budgetBytes).toBe(DVD_RW_8CM_USABLE_BYTES);
    expect(est.remainingBytes).toBe(DVD_RW_8CM_USABLE_BYTES - 400_000_000);
    expect(est.usedFraction).toBeCloseTo(400_000_000 / DVD_RW_8CM_USABLE_BYTES, 6);
  });

  it('flags an over-budget package', () => {
    const est = estimateDiscSize(2_000_000_000);
    expect(est.overBudget).toBe(true);
    expect(est.remainingBytes).toBeLessThan(0);
  });

  it('respects a custom budget', () => {
    const est = estimateDiscSize(150, 100);
    expect(est.overBudget).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formats byte scales', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1500)).toBe('1.5 KB');
    expect(formatBytes(412_000_000)).toBe('412 MB');
  });
});

describe('formatDuration', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});
