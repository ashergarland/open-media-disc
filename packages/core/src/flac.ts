import { FLAC_MAGIC } from './constants.js';

/** Basic metadata extracted from a FLAC file's metadata blocks. */
export interface FlacMetadata {
  /** True when the buffer starts with the `fLaC` stream marker. */
  isFlac: boolean;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  totalSamples?: number;
  /** Track duration in seconds, derived from STREAMINFO when available. */
  durationSeconds?: number;
  /** Vorbis comment tags, keyed by lowercased field name. */
  tags: Record<string, string>;
}

/** Return true when a buffer begins with the FLAC stream marker `fLaC`. */
export function isFlacBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).equals(FLAC_MAGIC);
}

/**
 * Parse FLAC metadata blocks (STREAMINFO + VORBIS_COMMENT) from a buffer.
 *
 * The buffer may be only a prefix of the file; parsing stops safely when it
 * runs out of bytes. This is a deliberately small, dependency-free reader that
 * covers what OMD Core v0.1 needs (duration and basic tags) without decoding
 * audio frames.
 */
export function parseFlacMetadata(buf: Buffer): FlacMetadata {
  const result: FlacMetadata = { isFlac: isFlacBuffer(buf), tags: {} };
  if (!result.isFlac) return result;

  let offset = 4; // skip "fLaC"
  let last = false;

  while (!last && offset + 4 <= buf.length) {
    const header = buf.readUInt32BE(offset);
    last = (header & 0x80000000) !== 0;
    const blockType = (header >>> 24) & 0x7f;
    const blockLength = header & 0x00ffffff;
    offset += 4;

    if (offset + blockLength > buf.length) break; // truncated buffer

    const block = buf.subarray(offset, offset + blockLength);
    if (blockType === 0) {
      readStreamInfo(block, result);
    } else if (blockType === 4) {
      readVorbisComment(block, result);
    }
    offset += blockLength;
  }

  return result;
}

function readStreamInfo(block: Buffer, out: FlacMetadata): void {
  if (block.length < 18) return;
  // Bytes 10..17 pack sample rate (20b), channels (3b), bps (5b), total samples (36b).
  const b10 = block[10]!;
  const b11 = block[11]!;
  const b12 = block[12]!;
  const b13 = block[13]!;

  const sampleRate = (b10 << 12) | (b11 << 4) | (b12 >> 4);
  const channels = ((b12 >> 1) & 0x07) + 1;
  const bitsPerSample = (((b12 & 0x01) << 4) | (b13 >> 4)) + 1;

  // 36-bit total sample count; use arithmetic (not bitwise) to stay > 32 bits.
  const highNibble = b13 & 0x0f;
  const totalSamples =
    highNibble * 2 ** 32 +
    block[14]! * 2 ** 24 +
    block[15]! * 2 ** 16 +
    block[16]! * 2 ** 8 +
    block[17]!;

  out.sampleRate = sampleRate;
  out.channels = channels;
  out.bitsPerSample = bitsPerSample;
  out.totalSamples = totalSamples;
  if (sampleRate > 0 && totalSamples > 0) {
    out.durationSeconds = totalSamples / sampleRate;
  }
}

function readVorbisComment(block: Buffer, out: FlacMetadata): void {
  let p = 0;
  if (p + 4 > block.length) return;
  const vendorLen = block.readUInt32LE(p);
  p += 4 + vendorLen;
  if (p + 4 > block.length) return;
  const count = block.readUInt32LE(p);
  p += 4;

  for (let i = 0; i < count; i++) {
    if (p + 4 > block.length) break;
    const len = block.readUInt32LE(p);
    p += 4;
    if (p + len > block.length) break;
    const entry = block.subarray(p, p + len).toString('utf8');
    p += len;
    const eq = entry.indexOf('=');
    if (eq > 0) {
      const key = entry.slice(0, eq).toLowerCase();
      const value = entry.slice(eq + 1);
      out.tags[key] = value;
    }
  }
}
