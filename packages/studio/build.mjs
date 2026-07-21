import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';

/**
 * Bundle OMD Studio with esbuild.
 *
 * The main and preload processes are bundled as CommonJS (with the OMD core
 * bundled in, Electron and Node built-ins left external), and the renderer is a
 * browser ES module. This sidesteps ESM/CJS friction across the Electron runtime.
 *
 * Pass `--watch` to rebuild on change; the app's dev live reload refreshes the
 * window automatically.
 */

const watchMode = process.argv.includes('--watch');

await rm('dist', { recursive: true, force: true });
await mkdir('dist/main', { recursive: true });
await mkdir('dist/renderer', { recursive: true });

const shared = { bundle: true, sourcemap: true, logLevel: 'info' };

const configs = [
  {
    ...shared,
    entryPoints: ['src/main/main.ts'],
    outfile: 'dist/main/main.cjs',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    // ffmpeg-static resolves its binary path via __dirname at runtime, so it
    // must stay external (not inlined) to keep pointing at node_modules.
    external: ['electron', 'ffmpeg-static'],
  },
  {
    ...shared,
    entryPoints: ['src/main/preload.ts'],
    outfile: 'dist/main/preload.cjs',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['electron'],
  },
  {
    ...shared,
    entryPoints: ['src/renderer/renderer.ts'],
    outfile: 'dist/renderer/renderer.js',
    platform: 'browser',
    format: 'esm',
    target: 'chrome122',
  },
];

/** Copy the static renderer files (HTML, shell CSS, theme stylesheets, logo assets) into dist. */
async function copyStatic() {
  await cp('src/renderer/index.html', 'dist/renderer/index.html');
  await cp('src/renderer/shell.css', 'dist/renderer/shell.css');
  await cp('src/renderer/components.css', 'dist/renderer/components.css');
  if (existsSync('src/renderer/themes')) {
    await cp('src/renderer/themes', 'dist/renderer/themes', { recursive: true });
  }
  if (existsSync('src/renderer/assets')) {
    await cp('src/renderer/assets', 'dist/renderer/assets', { recursive: true });
  }
}

if (watchMode) {
  const contexts = await Promise.all(configs.map((config) => context(config)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  await copyStatic();
  // esbuild rebuilds the .ts bundles; re-copy HTML/CSS/assets when they change.
  watch('src/renderer', { recursive: true }, (_event, filename) => {
    if (filename && /\.(html|css|png|jpe?g|svg|webp)$/i.test(filename)) {
      copyStatic().catch((error) => console.error(error));
    }
  });
  console.log('OMD Studio: watching for changes. Save a file and the app window reloads.');
} else {
  await Promise.all(configs.map((config) => build(config)));
  await copyStatic();
  console.log('OMD Studio bundled to dist/.');
}
