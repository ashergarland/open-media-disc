import { describe, expect, it } from 'vitest';
import {
  createManifest,
  validateManifest,
  stringifyManifest,
  type OmdTrack,
} from '../src/index.js';

const track = (number: number, overrides: Partial<OmdTrack> = {}): OmdTrack => ({
  number,
  title: `Track ${number}`,
  filename: `AUDIO/${number.toString().padStart(2, '0')} - Track ${number}.flac`,
  durationSeconds: 100 + number,
  sizeBytes: 1000 + number,
  sha256: 'a'.repeat(64),
  ...overrides,
});

const baseInput = () => ({
  discId: 'OMD-000001',
  artist: 'Artist',
  album: 'Album',
  releaseYear: 2026,
  tracks: [track(1), track(2)],
  coverArt: 'COVER.jpg',
  generator: { name: 'test', version: '0.1.0' },
  createdAt: new Date('2026-07-08T00:00:00.000Z'),
});

describe('createManifest', () => {
  it('derives trackCount and totals from tracks', () => {
    const m = createManifest(baseInput());
    expect(m.trackCount).toBe(2);
    expect(m.totalSizeBytes).toBe(1001 + 1002);
    expect(m.totalDurationSeconds).toBe(101 + 102);
    expect(m.omdFormat).toBe('OMD-FLAC-DATA');
    expect(m.omdVersion).toBe('0.1.0');
  });

  it('sorts tracks by number', () => {
    const m = createManifest({ ...baseInput(), tracks: [track(2), track(1)] });
    expect(m.tracks.map((t) => t.number)).toEqual([1, 2]);
  });

  it('produces deterministic JSON with a trailing newline', () => {
    const a = stringifyManifest(createManifest(baseInput()));
    const b = stringifyManifest(createManifest(baseInput()));
    expect(a).toBe(b);
    expect(a.endsWith('\n')).toBe(true);
  });
});

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const m = createManifest(baseInput());
    const result = validateManifest(m);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects a wrong omdFormat', () => {
    const m = { ...createManifest(baseInput()), omdFormat: 'NOT-OMD' };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.issues.join(' ')).toMatch(/omdFormat/);
  });

  it('rejects a track filename outside AUDIO/', () => {
    const m = createManifest(baseInput());
    const broken = { ...m, tracks: [{ ...m.tracks[0]!, filename: 'BAD/01.flac' }] };
    expect(validateManifest(broken).valid).toBe(false);
  });

  it('accepts an editable Unicode disc title as discId', () => {
    const m = { ...createManifest(baseInput()), discId: '真夏の日 / Deluxe' };
    expect(validateManifest(m).valid).toBe(true);
  });

  it('rejects an empty discId', () => {
    const m = { ...createManifest(baseInput()), discId: '' };
    expect(validateManifest(m).valid).toBe(false);
  });

  it('rejects unknown extra properties (strict schema)', () => {
    const m = { ...createManifest(baseInput()), surprise: true };
    expect(validateManifest(m).valid).toBe(false);
  });

  it('rejects a non-hex sha256', () => {
    const m = createManifest(baseInput());
    const broken = { ...m, tracks: [{ ...m.tracks[0]!, sha256: 'xyz' }] };
    expect(validateManifest(broken).valid).toBe(false);
  });
});
