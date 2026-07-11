/**
 * Regenerates the committed example fixtures under `examples/`.
 *
 * Run from the repo root with:  pnpm gen:examples
 *
 * Produces:
 *   examples/source-album/       a pre-package album folder (FLAC + cover)
 *   examples/valid-omd-album/    a valid OMD package built from source-album
 *   examples/invalid-omd-album/  a package with a deliberate checksum mismatch
 *
 * All audio files are tiny, silent, non-copyrighted TEST FIXTURES.
 */
import { appendFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateChecksums, createPackage, formatChecksumsFile } from '../packages/core/src/index.js';
import { writeFlacFixture } from '../packages/core/tests/helpers/flac-fixture.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const examples = path.join(repoRoot, 'examples');

const SOURCE = path.join(examples, 'source-album');
const VALID = path.join(examples, 'valid-omd-album');
const INVALID = path.join(examples, 'invalid-omd-album');

const ARTIST = 'OMD Test Ensemble';
const ALBUM = 'Fixtures Vol. 1';
const YEAR = 2026;

const TRACKS = [
  { number: 1, title: 'Silent Intro', seconds: 12 },
  { number: 2, title: 'Test Tone Alpha', seconds: 30 },
  { number: 3, title: 'Test Tone Beta', seconds: 45 },
];

/** Minimal JPEG (SOI + comment + EOI). Content is irrelevant to OMD tooling. */
function tinyJpeg(): Buffer {
  const comment = Buffer.from('OMD test fixture cover - not a real image', 'ascii');
  const len = comment.length + 2;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xfe, (len >> 8) & 0xff, len & 0xff]), // COM marker
    comment,
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}

async function buildSourceAlbum(): Promise<void> {
  await rm(SOURCE, { recursive: true, force: true });
  await mkdir(SOURCE, { recursive: true });

  const sampleRate = 44100;
  for (const t of TRACKS) {
    const name = `${t.number.toString().padStart(2, '0')} ${t.title}.flac`;
    await writeFlacFixture(path.join(SOURCE, name), {
      sampleRate,
      totalSamples: sampleRate * t.seconds,
      fillerBytes: 256 * t.number, // vary sizes a little
      tags: {
        artist: ARTIST,
        album: ALBUM,
        title: t.title,
        tracknumber: String(t.number),
        date: String(YEAR),
      },
    });
  }

  await writeFile(path.join(SOURCE, 'cover.jpg'), tinyJpeg());
  await writeFile(
    path.join(SOURCE, 'README.md'),
    [
      '# Source album fixture',
      '',
      'This folder is a **pre-package** album used by `omd create`. The FLAC files',
      'are tiny, silent TEST FIXTURES (metadata only, no real audio) and contain no',
      'copyrighted material.',
      '',
    ].join('\n'),
  );
}

async function buildValidPackage(): Promise<void> {
  await rm(VALID, { recursive: true, force: true });
  const { validation } = await createPackage({
    sourceDir: SOURCE,
    outDir: VALID,
    discId: 'OMD-000001',
    artist: ARTIST,
    album: ALBUM,
    releaseYear: YEAR,
    generator: { name: 'OMD example generator', version: '0.1.0' },
    createdAt: new Date('2026-07-08T00:00:00.000Z'),
  });
  console.log(`valid-omd-album: ${validation.valid ? 'VALID' : 'INVALID'}`);
}

async function buildInvalidPackage(): Promise<void> {
  await rm(INVALID, { recursive: true, force: true });
  // Start from the valid package, add a README, then re-checksum so the package
  // is fully valid — before corrupting a single track to force one clean error.
  await cp(VALID, INVALID, { recursive: true });
  await writeFile(
    path.join(INVALID, 'README.md'),
    [
      '# Invalid package fixture',
      '',
      'This package is intentionally invalid: track 02 was modified after the',
      'checksums were written, so validation reports a `CHECKSUM_MISMATCH` error.',
      '',
    ].join('\n'),
  );
  const entries = await calculateChecksums(INVALID);
  await writeFile(path.join(INVALID, 'CHECKSUMS.sha256'), formatChecksumsFile(entries));

  const target = path.join(INVALID, 'AUDIO', '02 - Test Tone Alpha.flac');
  await appendFile(target, Buffer.from('CORRUPTION', 'ascii'));
  console.log('invalid-omd-album: built (contains deliberate CHECKSUM_MISMATCH)');
}

await mkdir(examples, { recursive: true });
await buildSourceAlbum();
await buildValidPackage();
await buildInvalidPackage();
console.log('Examples regenerated.');
