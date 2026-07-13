import { describe, expect, it } from 'vitest';
import {
  createManifest,
  deriveVolumeLabel,
  slugifyForPath,
  MAX_VOLUME_LABEL_LENGTH,
  type CreateManifestInput,
  type OmdTrack,
} from '../src/index.js';

const track = (number: number, title: string): OmdTrack => ({
  number,
  title,
  filename: `AUDIO/${number.toString().padStart(2, '0')} - ${title}.flac`,
  sizeBytes: 1000,
  sha256: 'a'.repeat(64),
});

const manifest = (overrides: Partial<CreateManifestInput> = {}) =>
  createManifest({
    discId: 'Second Last Day of Summer',
    artist: 'Daydream Plus',
    album: 'Second Last Day of Summer',
    tracks: [track(1, 'Opening')],
    generator: { name: 'test', version: '0' },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

describe('slugifyForPath', () => {
  it('strips filesystem-hostile characters', () => {
    expect(slugifyForPath('Album: Live / Deluxe? "Edition"')).toBe('Album Live Deluxe Edition');
  });

  it('preserves Unicode letters', () => {
    expect(slugifyForPath('Café 日本語')).toBe('Café 日本語');
  });

  it('removes trailing dots and spaces', () => {
    expect(slugifyForPath('Greatest Hits...  ')).toBe('Greatest Hits');
  });

  it('falls back to a default when nothing usable remains', () => {
    expect(slugifyForPath('\\/:*?"<>|')).toBe('OMD-disc');
    expect(slugifyForPath('   ')).toBe('OMD-disc');
  });
});

describe('deriveVolumeLabel', () => {
  it('prefers the Unicode disc title', () => {
    expect(deriveVolumeLabel(manifest({ discId: 'Café Days' }))).toBe('Café Days');
  });

  it('keeps a Japanese title verbatim by default', () => {
    expect(deriveVolumeLabel(manifest({ discId: '日本語のタイトル' }))).toBe('日本語のタイトル');
  });

  it('caps the label length', () => {
    const long = 'A'.repeat(80);
    expect(deriveVolumeLabel(manifest({ discId: long })).length).toBe(MAX_VOLUME_LABEL_LENGTH);
  });

  it('produces an uppercase ASCII label when ascii is requested', () => {
    expect(deriveVolumeLabel(manifest({ discId: 'Café Days' }), { ascii: true })).toBe('CAFE_DAYS');
  });

  it('degrades to the first track title when the title has no ASCII', () => {
    const m = manifest({ discId: '日本語', tracks: [track(1, 'Sunrise')] });
    expect(deriveVolumeLabel(m, { ascii: true })).toBe('SUNRISE');
  });

  it('degrades to the artist when title and tracks have no ASCII', () => {
    const m = manifest({ discId: '日本語', artist: 'Daydream', tracks: [track(1, 'タイトル')] });
    expect(deriveVolumeLabel(m, { ascii: true })).toBe('DAYDREAM');
  });

  it('falls back to a stable content hash when nothing is ASCII', () => {
    const m = manifest({ discId: '日本語', artist: '日本', tracks: [track(1, 'タイトル')] });
    const label = deriveVolumeLabel(m, { ascii: true });
    expect(label).toMatch(/^OMD-[0-9A-F]{8}$/);
    expect(deriveVolumeLabel(m, { ascii: true })).toBe(label);
  });

  it('does not make labels unique across identical titles', () => {
    expect(deriveVolumeLabel(manifest({ discId: 'Twin' }))).toBe(
      deriveVolumeLabel(manifest({ discId: 'Twin' })),
    );
  });
});
