import { describe, expect, it } from 'vitest';
import { buildFlacBuffer } from './helpers/flac-fixture.js';
import { isFlacBuffer, parseFlacMetadata } from '../src/index.js';

describe('flac metadata parsing', () => {
  it('detects the FLAC magic marker', () => {
    const buf = buildFlacBuffer();
    expect(isFlacBuffer(buf)).toBe(true);
    expect(isFlacBuffer(Buffer.from('nope!'))).toBe(false);
  });

  it('derives duration from STREAMINFO', () => {
    const buf = buildFlacBuffer({ sampleRate: 44100, totalSamples: 44100 * 3 });
    const meta = parseFlacMetadata(buf);
    expect(meta.isFlac).toBe(true);
    expect(meta.sampleRate).toBe(44100);
    expect(meta.channels).toBe(2);
    expect(meta.bitsPerSample).toBe(16);
    expect(meta.durationSeconds).toBeCloseTo(3, 5);
  });

  it('reads vorbis comment tags', () => {
    const buf = buildFlacBuffer({
      tags: { artist: 'Blank Banshee', album: 'Blank Banshee 0', title: 'Teens', tracknumber: '4' },
    });
    const meta = parseFlacMetadata(buf);
    expect(meta.tags['artist']).toBe('Blank Banshee');
    expect(meta.tags['album']).toBe('Blank Banshee 0');
    expect(meta.tags['title']).toBe('Teens');
    expect(meta.tags['tracknumber']).toBe('4');
  });

  it('handles a non-flac buffer gracefully', () => {
    const meta = parseFlacMetadata(Buffer.from('hello world'));
    expect(meta.isFlac).toBe(false);
    expect(meta.tags).toEqual({});
  });
});
