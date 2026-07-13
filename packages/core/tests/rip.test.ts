import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHECKSUMS_FILENAME,
  MANIFEST_FILENAME,
  createPackage,
  OutputExistsError,
  ripPackage,
  validatePackage,
} from '../src/index.js';
import { makeSourceAlbum, useTempDir } from './helpers/fixtures.js';

const tmp = useTempDir();

async function makeDisc(): Promise<string> {
  const src = path.join(tmp.path(), 'album-src');
  const disc = path.join(tmp.path(), 'disc');
  await makeSourceAlbum(src, {
    artist: 'Rip Test',
    album: 'Rip Album',
    year: 2026,
    cover: true,
    tracks: [
      { number: 1, title: 'One', seconds: 10, fillerBytes: 100 },
      { number: 2, title: 'Two', seconds: 12, fillerBytes: 200 },
    ],
  });
  await createPackage({
    sourceDir: src,
    outDir: disc,
    discId: 'Rip Album',
    generator: { name: 'test', version: '0.1.0' },
    createdAt: new Date('2026-07-08T00:00:00.000Z'),
  });
  return disc;
}

describe('ripPackage', () => {
  it('rips a re-validating clone in package mode', async () => {
    const disc = await makeDisc();
    const out = path.join(tmp.path(), 'rip-package');
    const result = await ripPackage({ sourceDir: disc, outDir: out });

    expect(result.mode).toBe('package');
    expect(result.filesMatched).toBe(2);
    expect(result.filesTotal).toBe(2);
    expect(result.verified).toBe(true);
    expect(result.validation?.valid).toBe(true);
    expect(result.files[0]!.filename).toBe('AUDIO/01 - One.flac');

    // The clone stands on its own.
    const revalidate = await validatePackage(out);
    expect(revalidate.valid).toBe(true);
    await expect(stat(path.join(out, MANIFEST_FILENAME))).resolves.toBeDefined();
    await expect(stat(path.join(out, CHECKSUMS_FILENAME))).resolves.toBeDefined();
  });

  it('rips a friendly listening folder in album mode', async () => {
    const disc = await makeDisc();
    const out = path.join(tmp.path(), 'rip-album');
    const result = await ripPackage({ sourceDir: disc, outDir: out, mode: 'album' });

    expect(result.mode).toBe('album');
    expect(result.verified).toBe(true);
    expect(result.files.map((f) => f.filename)).toEqual(['01 - One.flac', '02 - Two.flac']);
    expect(result.validation).toBeUndefined();
    // Album mode carries no OMD scaffolding.
    await expect(stat(path.join(out, MANIFEST_FILENAME))).rejects.toThrow();
  });

  it('defaults the output to build/<slugified title>', async () => {
    const disc = await makeDisc();
    const cwd = process.cwd();
    process.chdir(tmp.path());
    try {
      const result = await ripPackage({ sourceDir: disc });
      expect(result.outDir).toBe(path.join('build', 'Rip Album'));
    } finally {
      process.chdir(cwd);
    }
  });

  it('refuses to overwrite an existing folder unless allowed', async () => {
    const disc = await makeDisc();
    const out = path.join(tmp.path(), 'rip-overwrite');
    await ripPackage({ sourceDir: disc, outDir: out });
    await expect(ripPackage({ sourceDir: disc, outDir: out })).rejects.toBeInstanceOf(
      OutputExistsError,
    );
    const result = await ripPackage({ sourceDir: disc, outDir: out, overwrite: true });
    expect(result.verified).toBe(true);
  });

  it('rejects an invalid source when validating', async () => {
    const disc = await makeDisc();
    await writeFile(path.join(disc, 'AUDIO', '01 - One.flac'), 'tampered', 'utf8');
    const out = path.join(tmp.path(), 'rip-invalid');
    await expect(ripPackage({ sourceDir: disc, outDir: out })).rejects.toThrow(/invalid OMD package/);
  });

  it('reports unmatched tracks when a copy does not match the manifest', async () => {
    const disc = await makeDisc();
    const manifestPath = path.join(disc, MANIFEST_FILENAME);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.tracks[0].sha256 = 'f'.repeat(64);
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf8');

    const out = path.join(tmp.path(), 'rip-mismatch');
    const result = await ripPackage({ sourceDir: disc, outDir: out, mode: 'album', validate: false });
    expect(result.verified).toBe(false);
    expect(result.filesMatched).toBe(1);
    expect(result.files.find((f) => !f.matched)?.filename).toBe('01 - One.flac');
  });
});
