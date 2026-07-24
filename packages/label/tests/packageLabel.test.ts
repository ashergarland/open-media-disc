import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createManifest, stringifyManifest } from '@open-media-disc/core';
import { buildPackageLabelSheet } from '../src/index.js';

/** SHA-256 of the empty string; a valid 64-char hex placeholder for fixtures. */
const EMPTY_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('buildPackageLabelSheet', () => {
  let dir = '';
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'omd-label-'));
  });
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function writePackage(coverArt: string | undefined): Promise<void> {
    const manifest = createManifest({
      discId: 'OMD-000500',
      artist: 'Test Artist',
      album: 'Test Album',
      tracks: [
        { number: 1, title: 'One', filename: 'AUDIO/01 - One.flac', sizeBytes: 1, sha256: EMPTY_SHA },
      ],
      generator: { name: 'test', version: '0.2.0' },
      ...(coverArt ? { coverArt } : {}),
    });
    await writeFile(path.join(dir, 'OMD-MANIFEST.json'), stringifyManifest(manifest), 'utf8');
    if (coverArt) {
      await writeFile(path.join(dir, coverArt), Buffer.from([1, 2, 3, 4]));
    }
  }

  it('embeds the cover art as a data URI and returns album facts', async () => {
    await writePackage('COVER.png');

    const result = await buildPackageLabelSheet({ packageDir: dir });

    expect(result.discId).toBe('OMD-000500');
    expect(result.artist).toBe('Test Artist');
    expect(result.album).toBe('Test Album');
    expect(result.svg).toContain('data:image/png;base64,');
    expect(result.placements).toHaveLength(1);
  });

  it('honors a copies count', async () => {
    await writePackage('COVER.png');

    const result = await buildPackageLabelSheet({ packageDir: dir, copies: 3 });

    expect(result.placements).toHaveLength(3);
  });

  it('throws when the package has no cover art', async () => {
    await writePackage(undefined);

    await expect(buildPackageLabelSheet({ packageDir: dir })).rejects.toThrow(/no cover art/i);
  });
});
