import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { detectMediaKind } from '../src/index.js';
import { useTempDir } from './helpers/fixtures.js';

describe('detectMediaKind', () => {
  const tmp = useTempDir();

  it('labels an ordinary folder as a package', async () => {
    expect(await detectMediaKind(tmp.path())).toBe('package');
  });

  it('labels the system temp directory as a package', async () => {
    expect(await detectMediaKind(tmpdir())).toBe('package');
  });
});
