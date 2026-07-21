import { open } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { codecForExtension, type AudioCodec } from './constants.js';
import { parseFlacMetadata } from './flac.js';

/** Codec-agnostic audio metadata used to build a manifest track. */
export interface AudioMeta {
  /** Detected codec from the file extension, if recognized. */
  codec?: AudioCodec;
  durationSeconds?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  /** Nominal bitrate in bits/second (mainly meaningful for lossy codecs). */
  bitrate?: number;
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  year?: number;
}

const FLAC_PREFIX_BYTES = 1_048_576;

async function readPrefix(filePath: string, length: number): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const size = (await handle.stat()).size;
    const toRead = Math.min(length, size);
    const buf = Buffer.alloc(toRead);
    await handle.read(buf, 0, toRead, 0);
    return buf;
  } finally {
    await handle.close();
  }
}

function yearFromDate(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const n = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Read audio metadata for any supported codec. FLAC is read with the built-in
 * dependency-free parser (robust for minimal/edge FLACs); everything else uses
 * `music-metadata`. Never throws — returns what it can.
 */
export async function readAudioMeta(filePath: string): Promise<AudioMeta> {
  const codec = codecForExtension(path.extname(filePath));
  if (codec === 'FLAC') {
    try {
      const meta = parseFlacMetadata(await readPrefix(filePath, FLAC_PREFIX_BYTES));
      const tags = meta.tags;
      return {
        codec,
        ...(meta.durationSeconds !== undefined ? { durationSeconds: meta.durationSeconds } : {}),
        ...(meta.sampleRate !== undefined ? { sampleRate: meta.sampleRate } : {}),
        ...(meta.bitsPerSample !== undefined ? { bitsPerSample: meta.bitsPerSample } : {}),
        ...(tags['title'] ? { title: tags['title'] } : {}),
        ...(tags['artist'] ?? tags['albumartist']
          ? { artist: tags['artist'] ?? tags['albumartist'] }
          : {}),
        ...(tags['album'] ? { album: tags['album'] } : {}),
        ...(tags['tracknumber']
          ? { trackNumber: Number.parseInt(tags['tracknumber'].split('/')[0]!, 10) }
          : {}),
        ...(yearFromDate(tags['date']) !== undefined ? { year: yearFromDate(tags['date']) } : {}),
      };
    } catch {
      return { codec };
    }
  }
  try {
    const mm = await parseFile(filePath, { duration: true });
    const { common, format } = mm;
    return {
      ...(codec ? { codec } : {}),
      ...(format.duration !== undefined ? { durationSeconds: format.duration } : {}),
      ...(format.sampleRate !== undefined ? { sampleRate: format.sampleRate } : {}),
      ...(format.bitsPerSample !== undefined ? { bitsPerSample: format.bitsPerSample } : {}),
      ...(format.bitrate !== undefined ? { bitrate: format.bitrate } : {}),
      ...(common.title ? { title: common.title } : {}),
      ...(common.artist ?? common.albumartist
        ? { artist: common.artist ?? common.albumartist }
        : {}),
      ...(common.album ? { album: common.album } : {}),
      ...(common.track?.no != null ? { trackNumber: common.track.no } : {}),
      ...(common.year !== undefined ? { year: common.year } : {}),
    };
  } catch {
    return codec ? { codec } : {};
  }
}
