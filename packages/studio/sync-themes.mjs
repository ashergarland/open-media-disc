// Sync the visual-theme showcase CSS (the source of truth) into the Studio app.
// Each theme becomes one stylesheet = tokens.css + components.css concatenated,
// used verbatim. The app enables exactly one at a time to switch themes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const showcaseRoot = new URL('../../../sources/ThemeExamples/', import.meta.url);
const outDir = new URL('./src/renderer/themes/', import.meta.url);

const THEMES = [
  { id: 'frutiger-aero', dir: 'Frutiger Aero' },
  { id: 'dorfic', dir: 'DORFic' },
  { id: 'technozen', dir: 'Technozen' },
  { id: 'dark-aero', dir: 'Dark Aero' },
];

await mkdir(outDir, { recursive: true });

for (const theme of THEMES) {
  const base = new URL(`${theme.dir}/theme/`, showcaseRoot);
  const tokens = await readFile(new URL('tokens.css', base), 'utf8');
  const components = await readFile(new URL('components.css', base), 'utf8');
  const css = `/* AUTO-GENERATED from sources/ThemeExamples/${theme.dir} by sync-themes.mjs. Do not edit. */\n${tokens}\n${components}\n`;
  await writeFile(new URL(`${theme.id}.css`, outDir), css, 'utf8');
  console.log(`wrote themes/${theme.id}.css`);
}

console.log(`Synced ${THEMES.length} theme stylesheets into ${fileURLToPath(outDir)}`);
