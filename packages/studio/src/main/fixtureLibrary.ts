/**
 * OMD Studio fixture library.
 *
 * Generates a small, deterministic set of real OMD packages from *synthetic*
 * audio and placeholder cover art, so the app can run in `fixtures` mode without
 * ever touching copyrighted material or optical hardware. The packages are real
 * (they pass validation), so fixtures mode exercises the same core pipeline as
 * live data.
 *
 * This module is Electron-free (Node + core only) so it can be reused and tested
 * outside the app. The Electron IPC wiring lives in `fixtures.ts`.
 */

import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  createPackage,
  type BurnBackend,
  type BurnDrive,
  type BurnImageRequest,
  type DiscImageBackend,
  type DiscImageBuildRequest,
  type MediaInfo,
} from '@open-media-disc/core';

// ---------------------------------------------------------------------------
// Synthetic media (no real audio or artwork)
// ---------------------------------------------------------------------------

function metadataBlockHeader(isLast: boolean, type: number, length: number): Buffer {
  const header = Buffer.alloc(4);
  header[0] = (isLast ? 0x80 : 0x00) | (type & 0x7f);
  header[1] = (length >>> 16) & 0xff;
  header[2] = (length >>> 8) & 0xff;
  header[3] = length & 0xff;
  return header;
}

function buildStreamInfo(
  sampleRate: number,
  channels: number,
  bps: number,
  totalSamples: number,
): Buffer {
  const block = Buffer.alloc(34);
  block.writeUInt16BE(4096, 0);
  block.writeUInt16BE(4096, 2);
  const packed =
    (BigInt(sampleRate) << 44n) |
    (BigInt(channels - 1) << 41n) |
    (BigInt(bps - 1) << 36n) |
    BigInt(totalSamples);
  block.writeBigUInt64BE(packed, 10);
  return block;
}

function buildVorbisComment(tags: Record<string, string>): Buffer {
  const vendor = Buffer.from('OMD Studio fixture', 'utf8');
  const entries = Object.entries(tags).map(([k, v]) =>
    Buffer.from(`${k.toUpperCase()}=${v}`, 'utf8'),
  );
  const size = 4 + vendor.length + 4 + entries.reduce((sum, e) => sum + 4 + e.length, 0);
  const block = Buffer.alloc(size);
  let p = 0;
  block.writeUInt32LE(vendor.length, p);
  p += 4;
  vendor.copy(block, p);
  p += vendor.length;
  block.writeUInt32LE(entries.length, p);
  p += 4;
  for (const e of entries) {
    block.writeUInt32LE(e.length, p);
    p += 4;
    e.copy(block, p);
    p += e.length;
  }
  return block;
}

/**
 * A tiny, structurally-valid FLAC file: a real `fLaC` marker, STREAMINFO (so a
 * duration can be derived), and Vorbis tags. It has no audio frames, so it is a
 * safe non-copyrighted fixture, not real music.
 */
function buildFlac(opts: {
  seconds: number;
  tags: Record<string, string>;
  filler: number;
}): Buffer {
  const sampleRate = 44100;
  const streamInfo = buildStreamInfo(sampleRate, 2, 16, sampleRate * opts.seconds);
  const vorbis = buildVorbisComment(opts.tags);
  return Buffer.concat([
    Buffer.from('fLaC', 'ascii'),
    metadataBlockHeader(false, 0, streamInfo.length),
    streamInfo,
    metadataBlockHeader(true, 4, vorbis.length),
    vorbis,
    Buffer.alloc(opts.filler, 0),
  ]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** Clamp a number to a single byte. */
function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

/** Linearly mix two RGB colors by `t` in [0, 1]. */
function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * A deterministic, abstract cover: a diagonal gradient in the album's color plus
 * two soft tinted spots. No text and no libraries, so it stays a safe,
 * non-copyrighted fixture while reading as real album art rather than a flat swatch.
 */
function coverPng(size: number, [r, g, b]: [number, number, number]): Buffer {
  const base: [number, number, number] = [r, g, b];
  const dark = mixRgb(base, [10, 12, 20], 0.58);
  const light = mixRgb(base, [255, 255, 255], 0.42);
  const spots: { x: number; y: number; rad: number; color: [number, number, number] }[] = [
    { x: size * 0.72, y: size * 0.26, rad: size * 0.42, color: mixRgb(base, [255, 255, 255], 0.7) },
    { x: size * 0.22, y: size * 0.8, rad: size * 0.36, color: mixRgb(base, [6, 8, 14], 0.55) },
  ];
  const row = Buffer.alloc(1 + size * 3);
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = mixRgb(dark, light, (x + y) / (2 * (size - 1)));
      for (const spot of spots) {
        const d = Math.hypot(x - spot.x, y - spot.y) / spot.rad;
        if (d < 1) color = mixRgb(color, spot.color, (1 - d) * (1 - d) * 0.6);
      }
      const o = 1 + x * 3;
      row[o] = clampByte(color[0]);
      row[o + 1] = clampByte(color[1]);
      row[o + 2] = clampByte(color[2]);
    }
    rows.push(Buffer.from(row));
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Fixture album definitions
// ---------------------------------------------------------------------------

interface FixtureTrack {
  title: string;
  seconds: number;
}

interface FixtureAlbum {
  discId: string;
  artist: string;
  album: string;
  year: number;
  cover: [number, number, number];
  tracks: FixtureTrack[];
}

const FIXTURE_ALBUMS: FixtureAlbum[] = [
  {
    discId: 'OMD Test Ensemble - Aqua Fixtures Vol. 1',
    artist: 'OMD Test Ensemble',
    album: 'Aqua Fixtures Vol. 1',
    year: 2026,
    cover: [42, 178, 205],
    tracks: [
      { title: 'Glass Horizon', seconds: 214 },
      { title: 'Meltwater', seconds: 187 },
      { title: 'Signal Bloom', seconds: 241 },
      { title: 'Afterglow', seconds: 268 },
    ],
  },
  {
    discId: 'Fixture Synthetics - Neon Reverie',
    artist: 'Fixture Synthetics',
    album: 'Neon Reverie',
    year: 2025,
    cover: [138, 92, 246],
    tracks: [
      { title: 'Midnight Arcade', seconds: 198 },
      { title: 'Chrome Rain', seconds: 223 },
      { title: 'Parallax', seconds: 176 },
      { title: 'Vapor Trail', seconds: 205 },
      { title: 'Reentry', seconds: 259 },
    ],
  },
  {
    discId: 'Ambient Test Unit - Field Recordings',
    artist: 'Ambient Test Unit',
    album: 'Field Recordings',
    year: 2024,
    cover: [54, 209, 122],
    tracks: [
      { title: 'Low Tide', seconds: 312 },
      { title: 'Cedar Hush', seconds: 244 },
      { title: 'Distant Engine', seconds: 289 },
    ],
  },
];

/** Handles into a generated fixture library. */
export interface FixtureLibrary {
  /** Folder holding the generated OMD packages (used as the catalog/library). */
  libraryDir: string;
  /** The package used as the "inserted disc" in fixtures mode. */
  discDir: string;
  /** A loose source album folder (pre-package) for the import flow. */
  sourceDir: string;
  /** All generated package folders. */
  packageDirs: string[];
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/** Write one fixture album into `dir` as a loose source folder (FLAC + cover). */
async function writeSourceAlbum(dir: string, album: FixtureAlbum): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < album.tracks.length; i += 1) {
    const track = album.tracks[i]!;
    const n = i + 1;
    const name = `${String(n).padStart(2, '0')} ${track.title}.flac`;
    await writeFile(
      path.join(dir, name),
      buildFlac({
        seconds: track.seconds,
        filler: 512 * n,
        tags: {
          title: track.title,
          tracknumber: String(n),
          artist: album.artist,
          album: album.album,
          date: String(album.year),
        },
      }),
    );
  }
  await writeFile(path.join(dir, 'cover.png'), coverPng(480, album.cover));
}

/**
 * Ensure the fixture library exists under `root`, generating it when missing (or
 * when `reset` is set). Returns handles the app uses to seed fixtures mode.
 */
export async function ensureFixtureLibrary(root: string, reset = false): Promise<FixtureLibrary> {
  const libraryDir = path.join(root, 'library');
  const sourceRoot = path.join(root, 'source');
  const marker = path.join(root, '.omd-fixtures-ready');

  const discDir = path.join(libraryDir, slug(FIXTURE_ALBUMS[0]!.discId));
  const sourceDir = path.join(sourceRoot, 'incoming-album');
  const packageDirs = FIXTURE_ALBUMS.map((a) => path.join(libraryDir, slug(a.discId)));

  if (!reset && (await exists(marker))) {
    return { libraryDir, discDir, sourceDir, packageDirs };
  }

  await rm(root, { recursive: true, force: true });
  await mkdir(libraryDir, { recursive: true });

  // Build each album as a loose source folder, then package it into the library.
  for (const album of FIXTURE_ALBUMS) {
    const stage = path.join(sourceRoot, slug(album.discId));
    await writeSourceAlbum(stage, album);
    await createPackage({
      sourceDir: stage,
      outDir: path.join(libraryDir, slug(album.discId)),
      discId: album.discId,
      artist: album.artist,
      album: album.album,
      releaseYear: album.year,
      overwrite: true,
      generator: { name: 'OMD Studio (fixtures)', version: '0.1.0' },
    });
  }

  // A leftover loose album folder for the import flow to pick up.
  await writeSourceAlbum(sourceDir, FIXTURE_ALBUMS[1]!);

  await writeFile(marker, new Date().toISOString(), 'utf8');
  return { libraryDir, discDir, sourceDir, packageDirs };
}

/** Slugify a disc title into a filesystem-safe folder name (mirrors core's rule). */
function slug(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return cleaned.length > 0 ? cleaned : 'OMD-disc';
}

// ---------------------------------------------------------------------------
// Fake optical backends (no hardware)
// ---------------------------------------------------------------------------

/**
 * A burn backend that reports a single fake drive whose mount path is the
 * fixture disc folder, so disc detection, drive listing, and a simulated burn
 * all work with no optical hardware. Writes are no-ops; a burn "verifies" by
 * validating the fixture package that already sits at the mount path.
 */
export class FixtureBurnBackend implements BurnBackend {
  readonly name = 'OMD fixture drive';

  constructor(private readonly discDir: string) {}

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async listDrives(): Promise<BurnDrive[]> {
    return [{ mountPath: this.discDir, id: 'omd-fixture-0', description: 'OMD Fixture Writer' }];
  }

  async isBlank(): Promise<boolean> {
    return true;
  }

  async blank(): Promise<void> {
    // No physical media to erase.
  }

  async writeImage(_request: BurnImageRequest): Promise<void> {
    // Simulated write: the fixture package already sits at the mount path.
  }

  async probeMedia(): Promise<MediaInfo> {
    return {
      present: true,
      kind: 'rewritable',
      blank: true,
      typeName: 'DVD-RW',
      capacityBytes: 1_400_000_000,
    };
  }

  async remount(): Promise<void> {
    // Nothing to remount for a simulated drive.
  }

  async eject(): Promise<void> {
    // Nothing to eject for a simulated drive.
  }
}

/** A disc-image backend that writes a tiny placeholder file instead of a UDF image. */
export class FixtureDiscImageBackend implements DiscImageBackend {
  readonly name = 'OMD fixture image';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async build(request: DiscImageBuildRequest): Promise<void> {
    await writeFile(request.outPath, Buffer.from('OMD fixture disc image (simulated)'));
  }
}
