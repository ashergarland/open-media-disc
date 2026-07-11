import { describe, expect, it } from 'vitest';
import {
  formatChecksumsFile,
  parseChecksumsFile,
  sha256Buffer,
  type ChecksumEntry,
} from '../src/index.js';

describe('checksums helpers', () => {
  it('computes a known SHA-256 for an empty buffer', () => {
    expect(sha256Buffer(Buffer.alloc(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('round-trips a checksums file', () => {
    const entries: ChecksumEntry[] = [
      { sha256: 'a'.repeat(64), relativePath: 'AUDIO/01 - One.flac' },
      { sha256: 'b'.repeat(64), relativePath: 'OMD-MANIFEST.json' },
    ];
    const text = formatChecksumsFile(entries);
    expect(text.endsWith('\n')).toBe(true);
    const parsed = parseChecksumsFile(text);
    expect(parsed).toEqual(entries);
  });

  it('ignores blank lines when parsing', () => {
    const text = `${'c'.repeat(64)}  file.flac\n\n`;
    const parsed = parseChecksumsFile(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.relativePath).toBe('file.flac');
  });
});
