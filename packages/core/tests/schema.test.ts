import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { createManifest, type OmdTrack } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, '../../../spec/OMD_MANIFEST_SCHEMA.json');

async function loadValidator() {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

const track = (n: number): OmdTrack => ({
  number: n,
  title: `Track ${n}`,
  filename: `AUDIO/0${n} - Track ${n}.flac`,
  durationSeconds: 120,
  sizeBytes: 5000,
  sha256: 'b'.repeat(64),
});

describe('OMD_MANIFEST_SCHEMA.json conformance', () => {
  it('accepts a manifest produced by createManifest', async () => {
    const validate = await loadValidator();
    const manifest = createManifest({
      discId: 'OMD-000001',
      artist: 'Artist',
      album: 'Album',
      releaseYear: 2026,
      tracks: [track(1), track(2)],
      coverArt: 'COVER.jpg',
      generator: { name: 'OMD CLI', version: '0.1.0' },
      createdAt: new Date('2026-07-08T00:00:00.000Z'),
    });
    const ok = validate(manifest);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it('rejects a manifest missing required fields', async () => {
    const validate = await loadValidator();
    const ok = validate({ omdFormat: 'OMD-FLAC-DATA' });
    expect(ok).toBe(false);
  });

  it('rejects an unknown additional property', async () => {
    const validate = await loadValidator();
    const manifest = createManifest({
      discId: 'OMD-000001',
      artist: 'Artist',
      album: 'Album',
      tracks: [track(1)],
      generator: { name: 'OMD CLI', version: '0.1.0' },
      createdAt: new Date('2026-07-08T00:00:00.000Z'),
    });
    const ok = validate({ ...manifest, unexpected: 1 });
    expect(ok).toBe(false);
  });
});
