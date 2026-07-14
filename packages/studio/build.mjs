import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Bundle OMD Studio with esbuild.
 *
 * The main and preload processes are bundled as CommonJS (with the OMD core
 * bundled in, Electron and Node built-ins left external), and the renderer is a
 * browser ES module. This sidesteps ESM/CJS friction across the Electron runtime.
 */

await rm('dist', { recursive: true, force: true });
await mkdir('dist/main', { recursive: true });
await mkdir('dist/renderer', { recursive: true });

const shared = { bundle: true, sourcemap: true, logLevel: 'info' };

await build({
  ...shared,
  entryPoints: ['src/main/main.ts'],
  outfile: 'dist/main/main.cjs',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['electron'],
});

await build({
  ...shared,
  entryPoints: ['src/main/preload.ts'],
  outfile: 'dist/main/preload.cjs',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['electron'],
});

await build({
  ...shared,
  entryPoints: ['src/renderer/renderer.ts'],
  outfile: 'dist/renderer/renderer.js',
  platform: 'browser',
  format: 'esm',
  target: 'chrome122',
});

await cp('src/renderer/index.html', 'dist/renderer/index.html');
await cp('src/renderer/styles.css', 'dist/renderer/styles.css');

// Static renderer assets (logo art, etc.).
if (existsSync('src/renderer/assets')) {
  await cp('src/renderer/assets', 'dist/renderer/assets', { recursive: true });
}

console.log('OMD Studio bundled to dist/.');
