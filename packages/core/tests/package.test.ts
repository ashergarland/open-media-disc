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
  OutputExistsError,
  updatePackageMetadata,
  validatePackage,
} from '../src/index.js';
import { makeSourceAlbum, tinyJpeg, useTempDir } from './helpers/fixtures.js';

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

  it('defaults the disc title (discId) to the album title', async () => {
    const src = path.join(tmp.path(), 'src-default-id');
    const out = path.join(tmp.path(), 'out-default-id');
    await makeSourceAlbum(src, {
      artist: 'Default Artist',
      album: 'Default Album',
      year: 2026,
      tracks: [{ number: 1, title: 'One' }],
    });
    const { manifest } = await createPackage({
      sourceDir: src,
      outDir: out,
      generator: { name: 'test', version: '0.1.0' },
    });
    expect(manifest.discId).toBe('Default Album');
  });

  it('defaults the output folder to build/<slugified title>', async () => {
    const src = path.join(tmp.path(), 'src-default-out');
    await makeSourceAlbum(src, {
      artist: 'A',
      album: 'Night: Sessions',
      year: 2026,
      tracks: [{ number: 1, title: 'One' }],
    });
    const cwd = process.cwd();
    process.chdir(tmp.path());
    try {
      const { outDir, manifest } = await createPackage({
        sourceDir: src,
        generator: { name: 'test', version: '0.1.0' },
      });
      expect(manifest.discId).toBe('Night: Sessions');
      expect(outDir).toBe(path.join('build', 'Night Sessions'));
    } finally {
      process.chdir(cwd);
    }
  });

  it('refuses to overwrite an existing folder unless allowed', async () => {
    const src = path.join(tmp.path(), 'src-overwrite');
    const out = path.join(tmp.path(), 'out-overwrite');
    await makeSourceAlbum(src, {
      artist: 'Overwrite Artist',
      album: 'Overwrite Album',
      year: 2026,
      tracks: [{ number: 1, title: 'One' }],
    });
    const base = {
      sourceDir: src,
      outDir: out,
      generator: { name: 'test', version: '0.1.0' },
    };
    await createPackage(base);
    await expect(createPackage(base)).rejects.toBeInstanceOf(OutputExistsError);
    const { validation } = await createPackage({ ...base, overwrite: true });
    expect(validation.valid).toBe(true);
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

  it('finds cover art with a non-standard filename', async () => {
    const src = path.join(tmp.path(), 'src');
    const out = path.join(tmp.path(), 'out');
    await makeSourceAlbum(src, {
      artist: 'A',
      album: 'B',
      tracks: [{ number: 1, title: 'One' }],
      cover: false,
    });
    // The only image is named oddly; the packager should still pick it up.
    await writeFile(path.join(src, 'Toonami Deep Space Bass.jpg'), tinyJpeg());
    await createPackage({
      sourceDir: src,
      outDir: out,
      discId: 'OMD-000005',
      generator: { name: 'test', version: '0.1.0' },
    });
    const info = await inspectPackage(out);
    expect(info.coverArt).toBe('COVER.jpg');
    const result = await validatePackage(out);
    expect(result.warnings.map((w) => w.code)).not.toContain('MISSING_COVER_ART');
  });

  it('prefers the largest image when several unnamed images are present', async () => {
    const src = path.join(tmp.path(), 'src');
    const out = path.join(tmp.path(), 'out');
    await makeSourceAlbum(src, {
      artist: 'A',
      album: 'B',
      tracks: [{ number: 1, title: 'One' }],
      cover: false,
    });
    // Neither name is a known cover name or keyword; the larger file should win.
    await writeFile(path.join(src, 'img_a.png'), tinyJpeg());
    await writeFile(path.join(src, 'img_b.png'), Buffer.concat([tinyJpeg(), Buffer.alloc(4096)]));
    await createPackage({
      sourceDir: src,
      outDir: out,
      discId: 'OMD-000006',
      generator: { name: 'test', version: '0.1.0' },
    });
    const info = await inspectPackage(out);
    expect(info.coverArt).toBe('COVER.png');
    const copied = await readFile(path.join(out, 'COVER.png'));
    expect(copied.length).toBeGreaterThan(1000);
  });
});

describe('updatePackageMetadata', () => {
  it('edits album metadata and keeps the package valid', async () => {
    const { out } = await buildValidPackage(2);
    const { validation } = await updatePackageMetadata({
      packageDir: out,
      discId: 'My New Title',
      artist: 'New Artist',
      album: 'New Album',
      releaseYear: 1999,
      generator: { name: 'test', version: '0.1.0' },
    });
    expect(validation.valid).toBe(true);
    const info = await inspectPackage(out);
    expect(info.discId).toBe('My New Title');
    expect(info.artist).toBe('New Artist');
    expect(info.album).toBe('New Album');
    expect(info.releaseYear).toBe(1999);
    const revalidate = await validatePackage(out);
    expect(revalidate.valid).toBe(true);
  });

  it('rejects an invalid edit without corrupting the package', async () => {
    const { out } = await buildValidPackage(2);
    await expect(
      updatePackageMetadata({
        packageDir: out,
        artist: '',
        generator: { name: 'test', version: '0.1.0' },
      }),
    ).rejects.toThrow();
    // The package must be untouched: still valid, cover still present.
    const result = await validatePackage(out);
    expect(result.valid).toBe(true);
    await expect(readFile(path.join(out, 'COVER.jpg'))).resolves.toBeDefined();
  });

  it('edits track titles and keeps the package valid', async () => {
    const { out } = await buildValidPackage(3);
    await updatePackageMetadata({
      packageDir: out,
      trackTitles: [
        { number: 1, title: 'Opening' },
        { number: 3, title: 'Finale' },
      ],
      generator: { name: 'test', version: '0.1.0' },
    });
    const info = await inspectPackage(out);
    const titles = info.tracks.map((t) => t.title);
    expect(titles[0]).toBe('Opening');
    expect(titles[2]).toBe('Finale');
    const revalidate = await validatePackage(out);
    expect(revalidate.valid).toBe(true);
  });

  it('replaces the cover art and removes the old file', async () => {
    const { src, out } = await buildValidPackage(2);
    const newCover = path.join(src, 'replacement.png');
    await writeFile(newCover, Buffer.concat([tinyJpeg(), Buffer.alloc(2048)]));
    const { validation } = await updatePackageMetadata({
      packageDir: out,
      coverSourcePath: newCover,
      generator: { name: 'test', version: '0.1.0' },
    });
    expect(validation.valid).toBe(true);
    const info = await inspectPackage(out);
    expect(info.coverArt).toBe('COVER.png');
    await expect(readFile(path.join(out, 'COVER.jpg'))).rejects.toThrow();
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
