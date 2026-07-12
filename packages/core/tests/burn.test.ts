import { appendFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  burnImage,
  burnPackage,
  createPackage,
  resolveBurnBackend,
  verifyDisc,
  type BurnBackend,
  type BurnImageRequest,
  type DiscImageBackend,
  type DiscImageBuildRequest,
  type DiscMediaKind,
} from '../src/index.js';
import { makeSourceAlbum, useTempDir } from './helpers/fixtures.js';

/** Build a small valid OMD package under `root` and return its directory. */
async function buildTestPackage(root: string, discId = 'OMD-000200'): Promise<string> {
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

/** Corrupt the first audio track so its checksum no longer matches. */
async function corruptFirstTrack(packageDir: string): Promise<void> {
  const audioDir = path.join(packageDir, 'AUDIO');
  const [first] = await readdir(audioDir);
  await appendFile(path.join(audioDir, first!), Buffer.from('corruption'));
}

/** A burn backend that records calls and never touches hardware. */
function makeFakeBurnBackend(opts?: {
  available?: boolean;
  blank?: boolean;
  kind?: DiscMediaKind;
  typeName?: string;
  capacityBytes?: number;
}): {
  backend: BurnBackend;
  calls: { blank: number; write: BurnImageRequest[]; remount: number; eject: number };
} {
  const available = opts?.available ?? true;
  const blank = opts?.blank ?? false;
  const kind = opts?.kind ?? 'rewritable';
  const calls = { blank: 0, write: [] as BurnImageRequest[], remount: 0, eject: 0 };
  const backend: BurnBackend = {
    name: 'FakeBurner',
    isAvailable: async () => available,
    listDrives: async () => [{ mountPath: 'X:\\', id: 'fake' }],
    isBlank: async () => blank,
    probeMedia: async () => ({
      kind,
      blank,
      ...(opts?.typeName ? { typeName: opts.typeName } : {}),
      ...(opts?.capacityBytes !== undefined ? { capacityBytes: opts.capacityBytes } : {}),
    }),
    blank: async () => {
      calls.blank += 1;
    },
    writeImage: async (request) => {
      calls.write.push(request);
    },
    remount: async () => {
      calls.remount += 1;
    },
    eject: async () => {
      calls.eject += 1;
    },
  };
  return { backend, calls };
}

/** A disc-image backend that records requests and writes a placeholder image. */
function makeFakeImageBackend(): {
  backend: DiscImageBackend;
  calls: DiscImageBuildRequest[];
} {
  const calls: DiscImageBuildRequest[] = [];
  const backend: DiscImageBackend = {
    name: 'FakeImage',
    isAvailable: async () => true,
    build: async (request) => {
      calls.push(request);
      await mkdir(path.dirname(request.outPath), { recursive: true });
      await writeFile(request.outPath, Buffer.alloc(2048));
    },
  };
  return { backend, calls };
}

describe('verifyDisc', () => {
  const tmp = useTempDir();

  it('passes for a valid package tree', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const result = await verifyDisc(pkg);
    expect(result.valid).toBe(true);
  });

  it('fails when a file does not match its checksum', async () => {
    const pkg = await buildTestPackage(tmp.path());
    await corruptFirstTrack(pkg);

    const result = await verifyDisc(pkg);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'CHECKSUM_MISMATCH')).toBe(true);
  });
});

describe('burnImage', () => {
  const tmp = useTempDir();

  it('blanks a non-blank disc, writes the image, and verifies', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend, calls } = makeFakeBurnBackend({ blank: false });

    const result = await burnImage({
      imagePath: path.join(tmp.path(), 'disc.img'),
      drive: { mountPath: pkg },
      backend,
    });

    expect(calls.blank).toBe(1);
    expect(calls.write).toHaveLength(1);
    expect(result.blanked).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.backend).toBe('FakeBurner');
    // Remounts in place to verify, then ejects on success.
    expect(calls.remount).toBe(1);
    expect(calls.eject).toBe(1);
    expect(result.ejected).toBe(true);
    expect(result.media?.kind).toBe('rewritable');
  });

  it('skips blanking when the disc is already blank', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend, calls } = makeFakeBurnBackend({ blank: true });

    const result = await burnImage({
      imagePath: path.join(tmp.path(), 'disc.img'),
      drive: { mountPath: pkg },
      backend,
    });

    expect(calls.blank).toBe(0);
    expect(result.blanked).toBe(false);
    expect(result.verified).toBe(true);
  });

  it('reports verification failure without throwing', async () => {
    const pkg = await buildTestPackage(tmp.path());
    await corruptFirstTrack(pkg);
    const { backend } = makeFakeBurnBackend();

    const result = await burnImage({
      imagePath: path.join(tmp.path(), 'disc.img'),
      drive: { mountPath: pkg },
      backend,
    });

    expect(result.verified).toBe(false);
    expect(result.verification?.errors.some((e) => e.code === 'CHECKSUM_MISMATCH')).toBe(true);
    // A failed burn is left in the drive: not ejected.
    expect(result.ejected).toBe(false);
  });

  it('does not eject when eject is disabled, but still verifies', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend, calls } = makeFakeBurnBackend();

    const result = await burnImage({
      imagePath: path.join(tmp.path(), 'disc.img'),
      drive: { mountPath: pkg },
      backend,
      eject: false,
    });

    expect(result.verified).toBe(true);
    expect(result.ejected).toBe(false);
    expect(calls.eject).toBe(0);
    expect(calls.remount).toBe(1);
  });

  it('throws on a non-blank write-once disc instead of erasing it', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend, calls } = makeFakeBurnBackend({
      blank: false,
      kind: 'write-once',
      typeName: 'DVD-R',
    });

    await expect(
      burnImage({
        imagePath: path.join(tmp.path(), 'disc.img'),
        drive: { mountPath: pkg },
        backend,
      }),
    ).rejects.toThrow(/cannot be erased|write-once|DVD-R/i);
    expect(calls.blank).toBe(0);
    expect(calls.write).toHaveLength(0);
  });

  it('writes a blank write-once disc without blanking it', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend, calls } = makeFakeBurnBackend({
      blank: true,
      kind: 'write-once',
      typeName: 'DVD-R',
    });

    const result = await burnImage({
      imagePath: path.join(tmp.path(), 'disc.img'),
      drive: { mountPath: pkg },
      backend,
    });

    expect(calls.blank).toBe(0);
    expect(calls.write).toHaveLength(1);
    expect(result.verified).toBe(true);
    expect(result.media?.kind).toBe('write-once');
  });

  it('throws when the image will not fit the disc', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const imageFile = path.join(tmp.path(), 'big.img');
    await writeFile(imageFile, Buffer.alloc(4096));
    const { backend, calls } = makeFakeBurnBackend({ blank: true, capacityBytes: 1024 });

    await expect(
      burnImage({ imagePath: imageFile, drive: { mountPath: pkg }, backend }),
    ).rejects.toThrow(/will not fit/i);
    expect(calls.write).toHaveLength(0);
  });

  it('reports phases in order via onProgress', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend } = makeFakeBurnBackend({ blank: false });
    const phases: string[] = [];

    await burnImage({
      imagePath: path.join(tmp.path(), 'disc.img'),
      drive: { mountPath: pkg },
      backend,
      onProgress: (p) => phases.push(p.phase),
    });

    expect(phases).toContain('writing');
    expect(phases).toContain('verifying');
    expect(phases.indexOf('writing')).toBeLessThan(phases.indexOf('verifying'));
  });

  it('throws when the backend is unavailable', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const { backend } = makeFakeBurnBackend({ available: false });

    await expect(
      burnImage({
        imagePath: path.join(tmp.path(), 'disc.img'),
        drive: { mountPath: pkg },
        backend,
      }),
    ).rejects.toThrow(/not available/i);
  });
});

describe('resolveBurnBackend', () => {
  it('returns the Windows IMAPI2 backend', () => {
    expect(resolveBurnBackend().name).toBe('Windows IMAPI2');
  });
});

describe('burnPackage', () => {
  const tmp = useTempDir();

  it('builds an image from a package directory, then burns and verifies', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const image = makeFakeImageBackend();
    const { backend, calls } = makeFakeBurnBackend();

    const result = await burnPackage({
      source: pkg,
      drive: { mountPath: pkg }, // the burned disc mirrors the package
      backend,
      imageBackend: image.backend,
    });

    expect(image.calls).toHaveLength(1);
    expect(calls.write).toHaveLength(1);
    expect(result.verified).toBe(true);
  });

  it('burns a prebuilt image file directly, without building an image', async () => {
    const pkg = await buildTestPackage(tmp.path());
    const imageFile = path.join(tmp.path(), 'prebuilt.img');
    await writeFile(imageFile, Buffer.alloc(2048));
    const image = makeFakeImageBackend();
    const { backend, calls } = makeFakeBurnBackend();

    const result = await burnPackage({
      source: imageFile,
      drive: { mountPath: pkg },
      backend,
      imageBackend: image.backend,
    });

    expect(image.calls).toHaveLength(0);
    expect(calls.write[0]!.imagePath).toBe(imageFile);
    expect(result.verified).toBe(true);
  });
});
