import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { writeFlacFixture, type FlacFixtureOptions } from './flac-fixture.js';
import { mkdir, writeFile } from 'node:fs/promises';

/** A tiny JPEG (SOI + comment + EOI) for cover-art fixtures. */
export function tinyJpeg(): Buffer {
  const comment = Buffer.from('OMD test cover', 'ascii');
  const len = comment.length + 2;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xfe, (len >> 8) & 0xff, len & 0xff]),
    comment,
    Buffer.from([0xff, 0xd9]),
  ]);
}

/** Create a unique temp directory and clean it up automatically per test. */
export function useTempDir(): { path: () => string } {
  let dir = '';
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'omd-test-'));
  });
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });
  return { path: () => dir };
}

export interface TrackSpec {
  number: number;
  title: string;
  seconds?: number;
  fillerBytes?: number;
}

/**
 * Build a source album folder with FLAC fixtures and (optionally) a cover.
 */
export async function makeSourceAlbum(
  dir: string,
  opts: {
    artist?: string;
    album?: string;
    year?: number;
    tracks: TrackSpec[];
    cover?: boolean;
  },
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const sampleRate = 44100;
  for (const t of opts.tracks) {
    const name = `${t.number.toString().padStart(2, '0')} ${t.title}.flac`;
    const flacOpts: FlacFixtureOptions = {
      sampleRate,
      totalSamples: sampleRate * (t.seconds ?? 10),
      tags: {
        title: t.title,
        tracknumber: String(t.number),
        ...(opts.artist ? { artist: opts.artist } : {}),
        ...(opts.album ? { album: opts.album } : {}),
        ...(opts.year ? { date: String(opts.year) } : {}),
      },
    };
    if (t.fillerBytes !== undefined) flacOpts.fillerBytes = t.fillerBytes;
    await writeFlacFixture(path.join(dir, name), flacOpts);
  }
  if (opts.cover) {
    await writeFile(path.join(dir, 'cover.jpg'), tinyJpeg());
  }
}
