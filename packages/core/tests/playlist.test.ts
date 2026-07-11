import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPackage, playlistPaths } from '../src/index.js';
import { makeSourceAlbum, useTempDir } from './helpers/fixtures.js';

describe('playlistPaths', () => {
  const tmp = useTempDir();

  it('returns absolute track paths in manifest number order', async () => {
    const sourceDir = path.join(tmp.path(), 'src');
    const outDir = path.join(tmp.path(), 'OMD-000300');
    await makeSourceAlbum(sourceDir, {
      artist: 'A',
      album: 'B',
      tracks: [
        { number: 2, title: 'Second', seconds: 5 },
        { number: 1, title: 'First', seconds: 5 },
      ],
    });
    await createPackage({ sourceDir, outDir, discId: 'OMD-000300' });

    const paths = await playlistPaths(outDir);

    expect(paths).toHaveLength(2);
    expect(path.isAbsolute(paths[0]!)).toBe(true);
    expect(paths[0]!.endsWith('First.flac')).toBe(true);
    expect(paths[1]!.endsWith('Second.flac')).toBe(true);
  });
});
