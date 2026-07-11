import { appendFile, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHECKSUMS_FILENAME,
  MANIFEST_FILENAME,
  calculateChecksums,
  createPackage,
  formatChecksumsFile,
  inspectPackage,
  validatePackage,
} from '../src/index.js';
import { makeSourceAlbum, useTempDir } from './helpers/fixtures.js';

const tmp = useTempDir();

async function buildValidPackage(tracks = 3): Promise<{ src: string; out: string }> {
  const src = path.join(tmp.path(), 'src');
  const out = path.join(tmp.path(), 'out');
  await makeSourceAlbum(src, {
    artist: 'OMD Test Ensemble',
    album: 'Fixtures Vol. 1',
    year: 2026,
    cover: true,
    tracks: Array.from({ length: tracks }, (_, i) => ({
      number: i + 1,
      title: `Track ${i + 1}`,
      seconds: 10 + i,
      fillerBytes: 128 * (i + 1),
    })),
  });
  await createPackage({
    sourceDir: src,
    outDir: out,
    discId: 'OMD-000001',
    generator: { name: 'test', version: '0.1.0' },
    createdAt: new Date('2026-07-08T00:00:00.000Z'),
  });
  return { src, out };
}

describe('createPackage', () => {
  it('creates a valid package from a source album', async () => {
    const { out } = await buildValidPackage(3);
    const result = await validatePackage(out);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    const info = await inspectPackage(out);
    expect(info.discId).toBe('OMD-000001');
    expect(info.artist).toBe('OMD Test Ensemble');
    expect(info.album).toBe('Fixtures Vol. 1');
    expect(info.trackCount).toBe(3);
    expect(info.coverArt).toBe('COVER.jpg');
    expect(info.tracks.map((t) => t.number)).toEqual([1, 2, 3]);
  });

  it('infers metadata from FLAC tags when not overridden', async () => {
    const src = path.join(tmp.path(), 'src');
    const out = path.join(tmp.path(), 'out');
    await makeSourceAlbum(src, {
      artist: 'Inferred Artist',
      album: 'Inferred Album',
      year: 2025,
      tracks: [{ number: 1, title: 'Only Track' }],
    });
    const { manifest } = await createPackage({
      sourceDir: src,
      outDir: out,
      discId: 'OMD-000002',
      generator: { name: 'test', version: '0.1.0' },
    });
    expect(manifest.artist).toBe('Inferred Artist');
    expect(manifest.album).toBe('Inferred Album');
    expect(manifest.releaseYear).toBe(2025);
  });

  it('throws when the source folder has no FLAC files', async () => {
    const src = path.join(tmp.path(), 'empty');
    await makeSourceAlbum(src, { tracks: [] });
    await expect(
      createPackage({
        sourceDir: src,
        outDir: path.join(tmp.path(), 'out'),
        discId: 'OMD-000003',
        generator: { name: 'test', version: '0.1.0' },
      }),
    ).rejects.toThrow(/No FLAC files/);
  });
});

describe('validatePackage', () => {
  it('fails when the manifest is missing', async () => {
    const { out } = await buildValidPackage();
    await rm(path.join(out, MANIFEST_FILENAME));
    const result = await validatePackage(out);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('MISSING_MANIFEST');
  });

  it('fails when a listed track file is missing', async () => {
    const { out } = await buildValidPackage(3);
    const info = await inspectPackage(out);
    await rm(path.join(out, ...info.tracks[1]!.filename.split('/')));
    const result = await validatePackage(out);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('MISSING_TRACK_FILE');
  });

  it('fails on a checksum mismatch', async () => {
    const { out } = await buildValidPackage(2);
    const info = await inspectPackage(out);
    await appendFile(path.join(out, ...info.tracks[0]!.filename.split('/')), 'tamper');
    const result = await validatePackage(out);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('CHECKSUM_MISMATCH');
  });

  it('detects duplicate track numbers', async () => {
    const { out } = await buildValidPackage(2);
    const manifestPath = path.join(out, MANIFEST_FILENAME);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.tracks[1].number = manifest.tracks[0].number; // force a duplicate
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    // Rewrite checksums so only the duplicate-number rule fires.
    const entries = await calculateChecksums(out);
    await writeFile(path.join(out, CHECKSUMS_FILENAME), formatChecksumsFile(entries));

    const result = await validatePackage(out);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('DUPLICATE_TRACK_NUMBER');
  });

  it('warns (not errors) when a package is over the media budget', async () => {
    const { out } = await buildValidPackage(2);
    const result = await validatePackage(out, { budgetBytes: 10 });
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('CAPACITY_WARNING');
  });

  it('errors on over-budget in strict mode', async () => {
    const { out } = await buildValidPackage(2);
    const result = await validatePackage(out, { budgetBytes: 10, strict: true });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('CAPACITY_WARNING');
  });

  it('warns when cover art is missing', async () => {
    const src = path.join(tmp.path(), 'src');
    const out = path.join(tmp.path(), 'out');
    await makeSourceAlbum(src, {
      artist: 'A',
      album: 'B',
      tracks: [{ number: 1, title: 'One' }],
      cover: false,
    });
    await createPackage({
      sourceDir: src,
      outDir: out,
      discId: 'OMD-000004',
      generator: { name: 'test', version: '0.1.0' },
    });
    const result = await validatePackage(out);
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('MISSING_COVER_ART');
  });
});

describe('inspectPackage', () => {
  it('returns an album/track summary', async () => {
    const { out } = await buildValidPackage(3);
    const info = await inspectPackage(out);
    expect(info.omdFormat).toBe('OMD-FLAC-DATA');
    expect(info.omdVersion).toBe('0.1.0');
    expect(info.audioCodec).toBe('FLAC');
    expect(info.totalDurationSeconds).toBeGreaterThan(0);
    expect(info.tracks).toHaveLength(3);
  });
});
