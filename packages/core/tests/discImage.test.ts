import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDiscImage,
  createPackage,
  type DiscImageBackend,
  type DiscImageBuildRequest,
} from '../src/index.js';
import { makeSourceAlbum, useTempDir } from './helpers/fixtures.js';

/** Build a small valid OMD package under `root` and return its directory. */
async function buildTestPackage(root: string, discId = 'OMD-000123'): Promise<string> {
  const sourceDir = path.join(root, 'src-album');
  const outDir = path.join(root, discId);
  await makeSourceAlbum(sourceDir, {
    artist: 'Test Artist',
    album: 'Test Album',
    tracks: [
      { number: 1, title: 'One', seconds: 5 },
      { number: 2, title: 'Two', seconds: 5 },
    ],
    cover: true,
  });
  await createPackage({ sourceDir, outDir, discId });
  return outDir;
}

/** A backend that records requests and writes a small placeholder image. */
function makeFakeBackend(available = true): {
  backend: DiscImageBackend;
  calls: DiscImageBuildRequest[];
} {
  const calls: DiscImageBuildRequest[] = [];
  const backend: DiscImageBackend = {
    name: 'Fake',
    isAvailable: async () => available,
    build: async (request) => {
      calls.push(request);
      await mkdir(path.dirname(request.outPath), { recursive: true });
      await writeFile(request.outPath, Buffer.alloc(4096));
    },
  };
  return { backend, calls };
}

describe('buildDiscImage', () => {
  const tmp = useTempDir();

  it('builds an image from a valid package and labels it with the discId', async () => {
    const pkg = await buildTestPackage(tmp.path(), 'OMD-000123');
    const outPath = path.join(tmp.path(), 'out.img');
    const { backend, calls } = makeFakeBackend();

    const result = await buildDiscImage({ packageDir: pkg, outPath, backend });

    expect(result.volumeLabel).toBe('OMD-000123');
    expect(result.backend).toBe('Fake');
    expect(result.sizeBytes).toBe(4096);
    expect(result.outPath).toBe(outPath);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.packageDir).toBe(pkg);
    expect(calls[0]!.volumeLabel).toBe('OMD-000123');
  });

  it('honors a volume label override', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const outPath = path.join(tmp.path(), 'out.img');
    const { backend, calls } = makeFakeBackend();

    const result = await buildDiscImage({ packageDir: pkg, outPath, volumeLabel: 'MYDISC', backend });

    expect(result.volumeLabel).toBe('MYDISC');
    expect(calls[0]!.volumeLabel).toBe('MYDISC');
  });

  it('refuses to image an invalid package', async () => {
    const empty = path.join(tmp.path(), 'empty');
    await mkdir(empty, { recursive: true });
    const { backend, calls } = makeFakeBackend();

    await expect(
      buildDiscImage({ packageDir: empty, outPath: path.join(tmp.path(), 'x.img'), backend }),
    ).rejects.toThrow(/invalid OMD package/i);
    expect(calls).toHaveLength(0);
  });

  it('fails when the backend is unavailable', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend } = makeFakeBackend(false);

    await expect(
      buildDiscImage({ packageDir: pkg, outPath: path.join(tmp.path(), 'x.img'), backend }),
    ).rejects.toThrow(/not available/i);
  });
});
