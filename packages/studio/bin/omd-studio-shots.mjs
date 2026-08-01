#!/usr/bin/env node
/**
 * omd-studio-shots
 *
 * Path-independent launcher for OMD Studio's headless screenshot harness. Wraps
 * `electron . --omd-*` so an agent (or a blog author) can capture app views from
 * any working directory, defaulting to the copyright-safe fixtures data.
 *
 * Screenshots are written relative to the current working directory, so run it
 * from wherever you want the PNGs (for example a blog repo's images folder).
 *
 * Usage:
 *   omd-studio-shots [--views all|home,disc] [--out <dir>] [--data fixtures|real]
 *                    [--theme <id>] [--size <WxH>] [--reset-fixtures]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');

const HELP = `omd-studio-shots - capture OMD Studio screenshots headlessly

Usage:
  omd-studio-shots [options]

Options:
  --views <all|list>   Views to capture (comma-separated), or "all". Default: all.
                       Views: home, disc, catalog, burn, labels, themes, settings.
  --out <dir>          Output folder for PNGs (relative to cwd). Default: screenshots.
  --data <mode>        Data source: fixtures (default, copyright-safe) or real.
  --theme <id>         Theme to apply (for example midnight, daylight, ember).
  --size <WxH>         Capture window size. Default: 1440x900.
  --reset-fixtures     Regenerate the fixtures library before capturing.
  -h, --help           Show this help.

Examples:
  omd-studio-shots
  omd-studio-shots --views home,disc,catalog --out ./blog/images
  omd-studio-shots --data real --views settings
`;

function parseArgs(argv) {
  const parsed = { omd: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    const inlineValue = eq >= 0 ? arg.slice(eq + 1) : undefined;
    const value = () => (inlineValue !== undefined ? inlineValue : argv[(i += 1)]);
    switch (name) {
      case '-h':
      case '--help':
        parsed.help = true;
        break;
      case '--views':
        parsed.views = value();
        break;
      case '--out':
        parsed.outDir = value();
        break;
      case '--data':
        parsed.data = value();
        break;
      case '--theme':
        parsed.theme = value();
        break;
      case '--size':
        parsed.size = value();
        break;
      case '--reset-fixtures':
        parsed.reset = true;
        break;
      default:
        // Pass through raw --omd-* flags; ignore anything else.
        if (name.startsWith('--omd-')) parsed.omd.push(arg);
    }
  }
  return parsed;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

const mainBundle = path.join(appDir, 'dist', 'main', 'main.cjs');
if (!existsSync(mainBundle)) {
  process.stderr.write(
    'OMD Studio is not built. Build it first:\n  pnpm --filter @open-media-disc/studio build\n',
  );
  process.exit(1);
}

let electronPath;
try {
  electronPath = require('electron');
} catch {
  process.stderr.write('Could not resolve Electron. Run `pnpm install` in the OMD repo.\n');
  process.exit(1);
}

const omdArgs = [
  `--omd-data=${args.data ?? 'fixtures'}`,
  `--omd-screenshots=${args.views ?? 'all'}`,
  `--omd-out=${args.outDir ?? 'screenshots'}`,
  ...(args.theme ? [`--omd-theme=${args.theme}`] : []),
  ...(args.size ? [`--omd-size=${args.size}`] : []),
  ...(args.reset ? ['--omd-reset-fixtures'] : []),
  ...args.omd,
];

const child = spawn(electronPath, [appDir, ...omdArgs], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (error) => {
  process.stderr.write(`Failed to launch Electron: ${error.message}\n`);
  process.exit(1);
});
