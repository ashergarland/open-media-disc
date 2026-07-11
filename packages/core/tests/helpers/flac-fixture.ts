import { writeFile } from 'node:fs/promises';

/**
 * Test-only helpers to synthesize tiny, structurally-valid FLAC files.
 *
 * These fixtures contain a real `fLaC` marker, a STREAMINFO metadata block
 * (so duration can be derived), and a VORBIS_COMMENT block (tags). They contain
 * NO audio frames, so real decoders cannot play them — they exist purely as
 * lightweight, non-copyrighted TEST FIXTURES for OMD tooling.
 */

export interface FlacFixtureOptions {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  totalSamples?: number;
  tags?: Record<string, string>;
  /** Extra filler bytes appended so different tracks have different sizes. */
  fillerBytes?: number;
}

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
  bitsPerSample: number,
  totalSamples: number,
): Buffer {
  const block = Buffer.alloc(34);
  block.writeUInt16BE(4096, 0); // min block size
  block.writeUInt16BE(4096, 2); // max block size
  // min/max frame size (bytes 4..9) left as 0.

  // Pack sampleRate(20) | channels-1(3) | bps-1(5) | totalSamples(36) into 8 bytes.
  const packed =
    (BigInt(sampleRate) << 44n) |
    (BigInt(channels - 1) << 41n) |
    (BigInt(bitsPerSample - 1) << 36n) |
    BigInt(totalSamples);
  block.writeBigUInt64BE(packed, 10);
  // MD5 (bytes 18..33) left as zeros.
  return block;
}

function buildVorbisComment(tags: Record<string, string>): Buffer {
  const vendor = Buffer.from('OMD test fixture', 'utf8');
  const entries = Object.entries(tags).map(([k, v]) =>
    Buffer.from(`${k.toUpperCase()}=${v}`, 'utf8'),
  );

  const size =
    4 + vendor.length + 4 + entries.reduce((sum, e) => sum + 4 + e.length, 0);
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

/** Build a tiny FLAC fixture as a Buffer. */
export function buildFlacBuffer(options: FlacFixtureOptions = {}): Buffer {
  const sampleRate = options.sampleRate ?? 44100;
  const channels = options.channels ?? 2;
  const bitsPerSample = options.bitsPerSample ?? 16;
  const totalSamples = options.totalSamples ?? 44100; // 1 second by default
  const tags = options.tags ?? {};

  const streamInfo = buildStreamInfo(sampleRate, channels, bitsPerSample, totalSamples);
  const vorbis = buildVorbisComment(tags);
  const filler = options.fillerBytes ? Buffer.alloc(options.fillerBytes, 0) : Buffer.alloc(0);

  return Buffer.concat([
    Buffer.from('fLaC', 'ascii'),
    metadataBlockHeader(false, 0, streamInfo.length),
    streamInfo,
    metadataBlockHeader(true, 4, vorbis.length),
    vorbis,
    filler,
  ]);
}

/** Write a tiny FLAC fixture to disk. */
export async function writeFlacFixture(
  filePath: string,
  options: FlacFixtureOptions = {},
): Promise<void> {
  await writeFile(filePath, buildFlacBuffer(options));
}
