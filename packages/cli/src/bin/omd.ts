#!/usr/bin/env node
import { parseArgs } from '../args.js';
import { CLI_NAME, CLI_VERSION } from '../version.js';
import { createCommand } from '../commands/create.js';
import { validateCommand } from '../commands/validate.js';
import { inspectCommand } from '../commands/inspect.js';
import { checksumCommand } from '../commands/checksum.js';
import { playCommand } from '../commands/play.js';

const HELP = `${CLI_NAME} v${CLI_VERSION} — Open Media Disc packaging tool

Usage:
  omd create <albumFolder> [--out <dir>] [--disc-id OMD-000001]
                           [--artist <name>] [--album <title>] [--year <yyyy>]
  omd validate <packageDir> [--strict]
  omd inspect <packageDir>
  omd checksum <packageDir> [--write]
  omd play <packageDir>

Options:
  --help, -h       Show this help.
  --version, -v    Show version.

OMD Core v0.1 creates and validates OMD FLAC data packages. It does not burn
optical media or drive hardware. See the spec/ folder for the format contract.
`;

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const first = argv[0];

  if (!first || first === '--help' || first === '-h' || first === 'help') {
    console.log(HELP);
    return first ? 0 : 1;
  }
  if (first === '--version' || first === '-v') {
    console.log(CLI_VERSION);
    return 0;
  }

  const args = parseArgs(argv.slice(1));

  switch (first) {
    case 'create':
      return createCommand(args);
    case 'validate':
      return validateCommand(args);
    case 'inspect':
      return inspectCommand(args);
    case 'checksum':
      return checksumCommand(args);
    case 'play':
      return playCommand(args);
    default:
      console.error(`Unknown command: ${first}\n`);
      console.error(HELP);
      return 2;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`Error: ${(err as Error).message}`);
    process.exitCode = 1;
  });
