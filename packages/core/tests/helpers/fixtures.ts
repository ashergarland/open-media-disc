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
  /** Per-track artist tag (else the album artist applies). */
  artist?: string;
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
        ...(t.artist ?? opts.artist ? { artist: t.artist ?? opts.artist! } : {}),
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

/** Build a minimal valid 16-bit PCM WAV file (silence). */
export function buildWavBuffer(opts: { sampleRate?: number; seconds?: number } = {}): Buffer {
  const sampleRate = opts.sampleRate ?? 44100;
  const channels = 1;
  const bitsPerSample = 16;
  const frames = Math.round(sampleRate * (opts.seconds ?? 1));
  const dataSize = frames * channels * (bitsPerSample / 8);
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buf.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

/** Build a source album folder of WAV fixtures (a non-FLAC codec). */
export async function makeWavSourceAlbum(
  dir: string,
  opts: { tracks: TrackSpec[]; cover?: boolean },
): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const t of opts.tracks) {
    const name = `${t.number.toString().padStart(2, '0')} ${t.title}.wav`;
    await writeFile(path.join(dir, name), buildWavBuffer({ seconds: t.seconds ?? 1 }));
  }
  if (opts.cover) {
    await writeFile(path.join(dir, 'cover.jpg'), tinyJpeg());
  }
}
